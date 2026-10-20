#!/usr/bin/env node
// 部署前产物自检（t019）：与 .github/workflows/deploy.yml 的产物断言保持同一套规则。
// 用法：node scripts/predeploy-check.mjs [目录]   （默认 dist/）
// 规则：
//   index-*.js  api.github.com > 0              （阳性对照：GitHub 引擎）
//   index-*.js  sb_publishable = 0、supabase.co = 0（不是旧 Supabase 口味）
//   dist/       github_pat_ = 0、ghp_ = 0       （密钥绝不进产物）
//   dist/       pk_gh_token > 0                 （t019 密钥录入 UI 在）
// 判 0 必须先通过阳性对照；否则报「构建产物为空」，绝不误判为通过。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const targetDir = resolve(process.argv[2] || 'dist')
const rows = []
let fatal = ''
let indexFiles = []
let indexText = ''
let distText = ''

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) files.push(...walk(p))
    else if (st.isFile()) files.push(p)
  }
  return files
}

function count(haystack, needle) {
  let n = 0
  let i = 0
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++
    i += needle.length
  }
  return n
}

function add(check, actual, expect, pass, note = '') {
  rows.push({ check, actual, expect, pass, note })
}

try {
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    fatal = `目录不存在：${targetDir}`
  } else {
    const assetsDir = join(targetDir, 'assets')
    indexFiles = existsSync(assetsDir)
      ? readdirSync(assetsDir)
          .filter((f) => f.startsWith('index-') && f.endsWith('.js'))
          .sort()
      : []
    indexText = indexFiles
      .map((f) => readFileSync(join(assetsDir, f), 'utf8'))
      .join('\n')
    if (indexFiles.length === 0) {
      fatal = `构建产物为空：${join(targetDir, 'assets', 'index-*.js')} 不存在`
    } else {
      // 二进制文件按 latin1 读，保证 ASCII 标记不漏扫（中文字节不影响匹配）
      distText = walk(targetDir)
        .map((f) => readFileSync(f).toString('latin1'))
        .join('\n')
    }
  }
} catch (err) {
  fatal = `扫描失败：${err && err.message ? err.message : String(err)}`
}

if (fatal) {
  add('构建产物', '不可用', 'dist 可扫描', false, fatal)
} else {
  add('index-*.js 存在', `${indexFiles.length} 个`, '> 0', true)

  const apiIndex = count(indexText, 'api.github.com')
  const apiDist = count(distText, 'api.github.com')
  const controlOk = apiIndex > 0 && apiDist > 0
  const controlNote = controlOk ? '阳性对照' : '构建产物为空或口味错误'

  add('index-*.js api.github.com', String(apiIndex), '> 0', apiIndex > 0,
    apiIndex > 0 ? '阳性对照' : '构建产物为空')
  add('dist/ api.github.com', String(apiDist), '> 0', apiDist > 0,
    apiDist > 0 ? '阳性对照' : '构建产物为空')

  for (const needle of ['sb_publishable', 'supabase.co']) {
    const n = count(indexText, needle)
    add(`index-*.js ${needle}`, String(n), '= 0', controlOk && n === 0,
      n !== 0 ? '旧 Supabase 口味' : controlOk ? '' : `不能判定：${controlNote}`)
  }

  for (const needle of ['github_pat_', 'ghp_']) {
    const n = count(distText, needle)
    add(`dist/ ${needle}`, String(n), '= 0', controlOk && n === 0,
      n !== 0 ? '密钥泄漏' : controlOk ? '' : `不能判定：${controlNote}`)
  }

  const tokenUi = count(distText, 'pk_gh_token')
  add('dist/ pk_gh_token', String(tokenUi), '> 0', controlOk && tokenUi > 0,
    tokenUi === 0 ? 't019 密钥录入 UI 缺失' : controlOk ? 't019 UI 在' : `不能判定：${controlNote}`)
}

const W = [6, 34, 14, 12]
function displayWidth(s) {
  let w = 0
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0)
    // 粗略按东亚宽字符计 2 列，保证中文表头对齐
    w += (cp >= 0x1100 && (
      cp <= 0x115f || (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff)
    )) ? 2 : 1
  }
  return w
}
const pad = (s, width) => String(s) + ' '.repeat(Math.max(0, width - displayWidth(s)))
const line = (cells) => cells.map((c, i) => pad(c, W[i])).join('  ')
console.log(`predeploy-check 目标目录: ${targetDir}`)
console.log(line(['结果', '检查项', '实际', '期望']))
console.log(line(['------', '--------------------------------', '------------', '----------']))
for (const r of rows) {
  console.log(line([r.pass ? 'PASS' : 'FAIL', r.check, r.actual, r.expect]))
  if (r.note) console.log(`       ↳ ${r.note}`)
}

const failed = rows.filter((r) => !r.pass)
if (failed.length) {
  console.error(`\n✗ preflight 失败：${failed.length} 项不通过，拒绝部署`)
  process.exit(1)
}
console.log('\n✓ preflight 全部通过：GitHub 引擎 / 无旧 Supabase 口味 / 无密钥 / t019 UI 在')
