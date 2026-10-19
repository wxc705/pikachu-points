// t018 灌云基线：把设备导出的账本 JSON 推到 GitHub 数据仓（默认 wxc705/pikachu-data）
//
// 背景：云端数据仓是 0 文件 0 提交的空仓，绝不能让空云端面对多设备 ——
//       必须先把"账本最全的设备"（iPad）导出 → 灌进云端做基线 → 其它设备再 pull。
//
// 用法：
//   1) 设备上导出账本：控制台 `dumpData()` 或打开 `#/parent?dump=1` → 得到
//      pikachu-points-dump-<时间>.json
//   2) 灌云（token 只从环境变量读，不写文件不进 git）：
//        VITE_GH_TOKEN=ghp_xxx node scripts/seed-cloud.mjs path/to/dump.json
//      可选：--repo owner/name（默认 wxc705/pikachu-data）  --dry-run（只打印不写）
//   3) 验收云端行数：
//        VITE_GH_TOKEN=ghp_xxx node scripts/seed-cloud.mjs --verify
//
// 语义：按 id 并集合并，updated_at/created_at 新者赢；云端已有的行永不被"读空"覆盖。
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const verifyOnly = args.includes('--verify')
const repoArgIdx = args.indexOf('--repo')
const REPO = repoArgIdx >= 0 ? args[repoArgIdx + 1] : 'wxc705/pikachu-data'
const FILE = args.find((a) => !a.startsWith('--') && a !== REPO)

const TOKEN = process.env.VITE_GH_TOKEN || process.env.GH_TOKEN || ''
if (!TOKEN) {
  console.error('[seed-cloud] ✗ 缺环境变量 VITE_GH_TOKEN（token 只走环境变量，拒绝落盘/硬编码）')
  process.exit(1)
}
const API = 'https://api.github.com'
const headers = (accept) => ({
  Authorization: 'Bearer ' + TOKEN,
  Accept: accept,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json'
})

// 与 src/services/sync.js 的 push 映射保持一致（行级字段白名单：push 加字段这里必须跟）
const TABLE_MAP = {
  checkins: (r) => ({
    id: r.id, task_id: r.taskId || null, project_id: r.projectId ?? null, project_name: r.projectName,
    category: r.category, points_earned: r.pointsEarned, note: r.note, checked_by: r.checkedBy,
    date: r.date, created_at: iso(r.createdAt), updated_at: iso(r.updatedAt || r.createdAt)
  }),
  exchange_requests: (r) => ({
    id: r.id, reward: r.reward, points_cost: r.pointsCost, note: r.note, status: r.status,
    viewed: r.viewed || false, date: r.date, created_at: iso(r.createdAt), decided_at: iso(r.decidedAt)
  }),
  projects: (r) => ({
    id: r.id, category: r.category, name: r.name, points: r.points, point_range: r.pointRange,
    sort_order: r.sortOrder, is_active: r.isActive, updated_at: iso(r.updatedAt)
  }),
  weekly_tasks: (r) => ({
    id: r.id, weekday: r.weekday, time_slot: r.timeSlot, name: r.name, points: r.points,
    category: r.category, sort_order: r.sortOrder, is_active: r.isActive !== false,
    once: r.once || null, skips: Array.isArray(r.skips) && r.skips.length ? r.skips : null,
    created_at: iso(r.createdAt), updated_at: iso(r.updatedAt || r.createdAt)
  }),
  daily_homework: (r) => ({
    id: r.id, date: r.date, tasks: r.tasks, source: r.source, created_at: iso(r.createdAt)
  }),
  daily_checkins: (r) => ({
    id: r.id, date: r.date, task_id: r.taskId, task_name: r.taskName, category: r.category,
    points: r.points, completed_at: r.completedAt || null, checked_by: r.checkedBy || 'kid',
    updated_at: iso(r.updatedAt || r.completedAt || r.createdAt)
  })
}

function iso(v) {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') return new Date(v).toISOString()
  const t = Date.parse(v)
  return isNaN(t) ? String(v) : new Date(t).toISOString()
}

function rowTs(row) {
  if (!row || typeof row !== 'object') return 0
  for (const k of ['updated_at', 'created_at']) {
    if (row[k]) {
      const t = Date.parse(row[k])
      if (!isNaN(t)) return t
      const n = Number(row[k])
      if (!isNaN(n)) return n
    }
  }
  const n = Number(row.id)
  return isNaN(n) ? 0 : n
}

function unionById(cloud, incoming) {
  const out = { ...cloud } // 云端已有行先占位：读空也删不掉它们
  for (const [k, row] of Object.entries(incoming)) {
    const prev = out[k]
    if (!prev || rowTs(row) >= rowTs(prev)) out[k] = row
  }
  return out
}

async function getSha(table) {
  const res = await fetch(`${API}/repos/${REPO}/contents/tables/${table}.json`, { headers: headers('application/vnd.github+json') })
  if (res.status === 404) return { sha: null, error: null }
  if (!res.ok) return { sha: null, error: `HTTP ${res.status}` }
  try { return { sha: (await res.json()).sha || null, error: null } } catch (e) { return { sha: null, error: 'sha 解析失败' } }
}

async function getRows(table) {
  const res = await fetch(`${API}/repos/${REPO}/contents/tables/${table}.json`, { headers: headers('application/vnd.github.raw') })
  if (res.status === 404) return { rows: null, error: null } // 云端还没有这个文件（真·空）
  if (!res.ok) return { rows: null, error: `HTTP ${res.status}` }
  const text = await res.text()
  if (!text.trim()) return { rows: null, error: '云端文件存在但内容为空' }
  try {
    const obj = JSON.parse(text)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { rows: null, error: '格式不是 {id: row}' }
    return { rows: obj, error: null }
  } catch (e) { return { rows: null, error: 'JSON 解析失败' } }
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return Buffer.from(bin, 'binary').toString('base64')
}

async function putTable(table, obj, sha, message) {
  const body = { message, content: toBase64(JSON.stringify(obj)) }
  if (sha) body.sha = sha
  const res = await fetch(`${API}/repos/${REPO}/contents/tables/${table}.json`, {
    method: 'PUT', headers: headers('application/vnd.github+json'), body: JSON.stringify(body)
  })
  if (res.ok) return { error: null }
  let m = ''
  try { m = (await res.json()).message || '' } catch (e) {}
  return { error: `HTTP ${res.status}${m ? ' ' + m : ''}` }
}

function loadDump(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const stores = raw.stores && typeof raw.stores === 'object' ? raw.stores : raw // 兼容裸 {表: 行数组}
  return { meta: raw, stores }
}

async function main() {
  console.log(`[seed-cloud] repo=${REPO} token=<len ${TOKEN.length}> dryRun=${dryRun}`)

  if (verifyOnly) {
    let total = 0
    const lines = []
    for (const table of Object.keys(TABLE_MAP)) {
      const g = await getRows(table)
      const n = g.rows ? Object.keys(g.rows).length : 0
      total += n
      lines.push(`  ${table.padEnd(18)} ${g.error ? 'ERR ' + g.error : n + ' rows'}`)
    }
    console.log(lines.join('\n'))
    console.log(`[seed-cloud] 云端总行数 = ${total}`)
    return
  }

  if (!FILE) {
    console.error('[seed-cloud] ✗ 用法: node scripts/seed-cloud.mjs <dump.json> | --verify  [--repo o/n] [--dry-run]')
    process.exit(1)
  }

  const { meta, stores } = loadDump(FILE)
  console.log(`[seed-cloud] 输入=${FILE} exportedAt=${meta.exportedAt || '?'} totalRows=${meta.totalRows || '?'}`)
  if (meta.readError) console.warn(`[seed-cloud] ⚠ 导出文件带 readError（读取路径当时是断的）: ${meta.readError}`)

  let pushedRows = 0
  const report = []
  for (const [table, mapper] of Object.entries(TABLE_MAP)) {
    const src = Array.isArray(stores[table]) ? stores[table] : []
    const incoming = {}
    for (const r of src) {
      if (!r || r.id == null) continue
      const row = mapper(r)
      if (row.updated_at === undefined) delete row.updated_at
      incoming[String(r.id)] = row
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const s = await getSha(table)
      if (s.error) { report.push(`  ${table.padEnd(18)} ✗ 取 sha 失败: ${s.error}`); break }
      let cloud = {}
      if (s.sha) {
        const cur = await getRows(table)
        if (cur.error) { report.push(`  ${table.padEnd(18)} ✗ 读云端失败(${cur.error})，拒绝覆盖，跳过`); break }
        if (cur.rows == null) { report.push(`  ${table.padEnd(18)} ✗ 云端文件存在但读取为空，拒绝覆盖（红线），跳过`); break }
        cloud = cur.rows
      }
      const merged = unionById(cloud, incoming)
      if (!Object.keys(merged).length) { report.push(`  ${table.padEnd(18)} 0 rows（本地与云端都空，不写）`); break }
      if (dryRun) {
        report.push(`  ${table.padEnd(18)} [dry-run] 云端 ${Object.keys(cloud).length} + 本地 ${Object.keys(incoming).length} → ${Object.keys(merged).length}`)
        break
      }
      const e = await putTable(table, merged, s.sha, `seed(t018): baseline ${table} ${Object.keys(incoming).length} rows from dump`)
      if (e.error && /409|sha/i.test(e.error) && attempt === 0) continue // 冲突 → 重拉重合并重试 1 次
      if (e.error) { report.push(`  ${table.padEnd(18)} ✗ PUT 失败: ${e.error}`); break }
      const n = Object.keys(merged).length
      pushedRows += n
      report.push(`  ${table.padEnd(18)} 云端 ${Object.keys(cloud).length} + 本地 ${Object.keys(incoming).length} → ${n} rows ✓`)
      break
    }
  }
  console.log(report.join('\n'))
  console.log(`[seed-cloud] 完成：云端总行数 = ${pushedRows}`)
}

main().catch((e) => {
  console.error('[seed-cloud] ✗', e && e.message ? e.message : e)
  process.exit(1)
})
