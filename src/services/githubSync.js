// GitHub Contents API 同步引擎（t017：Supabase → GitHub 私有仓库）
// 契约与 supabase-js 的最小用法对齐：client.from(table).upsert(rows,{onConflict}) / .select('*')
// sync.js 通过 syncEngineClient()/isSyncEngineConfigured() 二选一，push/pull/脏标/防双记逻辑零改动。
// 硬约束：只走 api.github.com（raw.githubusercontent.com 国内被墙，禁用）；CORS 由 GitHub API 支持。
// token 只从构建期环境变量 VITE_GH_TOKEN 注入，不写源码、不落日志、不进 commit。

import { supabase, isSupabaseConfigured } from './supabase.js'

export const SYNC_ENGINE = import.meta.env.VITE_SYNC_ENGINE || ''
const GH_TOKEN = import.meta.env.VITE_GH_TOKEN || ''
const GH_REPO = import.meta.env.VITE_GH_REPO || '' // 形如 wxc705/pikachu-data
const API = 'https://api.github.com'

export function isGithubConfigured() {
  return SYNC_ENGINE === 'github' && !!GH_TOKEN && !!GH_REPO
}

// 引擎可用性判断（取代 sync/KidHome 里的 isSupabaseConfigured）
export function isSyncEngineConfigured() {
  if (SYNC_ENGINE === 'github') return isGithubConfigured()
  return isSupabaseConfigured()
}

export function syncEngineClient() {
  if (SYNC_ENGINE === 'github') return githubClient
  return supabase
}

// ---- 底层 REST ----
function ghHeaders(accept) {
  return {
    'Authorization': 'Bearer ' + GH_TOKEN,
    'Accept': accept,
    'X-GitHub-Api-Version': '2022-11-28'
  }
}
function contentsUrl(table) {
  return `${API}/repos/${GH_REPO}/contents/tables/${table}.json`
}
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
function errObj(msg) {
  return { message: msg } // sync.js 的 catch 用 e.message
}

// 读表（raw Accept 直接拿 JSON 文本）：404 = 仓库里还没有这个文件 → 空表不算错
async function getTableRaw(table) {
  const res = await fetch(contentsUrl(table), { headers: ghHeaders('application/vnd.github.raw') })
  if (res.status === 404) return { rows: null, error: null }
  if (!res.ok) return { rows: null, error: errObj(`GitHub GET tables/${table}.json HTTP ${res.status}`) }
  const text = await res.text()
  try {
    const obj = JSON.parse(text)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { rows: null, error: errObj(`tables/${table}.json 格式不是 {id: row}`) }
    return { rows: obj, error: null }
  } catch (e) {
    return { rows: null, error: errObj(`tables/${table}.json JSON 解析失败`) }
  }
}

// 写前拿最新 sha（404 = 新建，不带 sha）
async function getSha(table) {
  const res = await fetch(contentsUrl(table), { headers: ghHeaders('application/vnd.github+json') })
  if (res.status === 404) return { sha: null, error: null }
  if (!res.ok) return { sha: null, error: errObj(`GitHub SHA GET tables/${table}.json HTTP ${res.status}`) }
  try {
    const j = await res.json()
    return { sha: j.sha || null, error: null }
  } catch (e) {
    return { sha: null, error: errObj(`GitHub SHA 解析失败 (${table})`) }
  }
}

async function putTable(table, obj, sha, message) {
  const body = { message, content: toBase64(JSON.stringify(obj, null, 0)) }
  if (sha) body.sha = sha
  const res = await fetch(contentsUrl(table), {
    method: 'PUT',
    headers: ghHeaders('application/vnd.github+json'),
    body: JSON.stringify(body)
  })
  if (res.ok) return { status: res.status, error: null }
  let apiMsg = ''
  try { apiMsg = (await res.json()).message || '' } catch (e) {}
  return { status: res.status, error: errObj(`GitHub PUT tables/${table}.json HTTP ${res.status}${apiMsg ? ' ' + apiMsg : ''}`) }
}

// 按 id 合并：updated_at 新者赢（缺省回落 created_at → 无时间戳时不覆盖云端），本地新行直接进
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
  const id = Number(row.id)
  return isNaN(id) ? 0 : id
}
function mergeById(cloud, incoming) {
  const out = { ...cloud }
  for (const row of incoming || []) {
    if (row == null || row.id == null) continue
    const key = String(row.id)
    const prev = out[key]
    if (!prev || rowTs(row) >= rowTs(prev)) out[key] = row
  }
  return out
}

// ---- supabase-js 兼容面 ----
async function upsert(table, rows) {
  try {
    for (let attempt = 0; attempt < 2; attempt++) { // 409 冲突 → 重拉重合并重试 1 次
      const s = await getSha(table)
      if (s.error) return { error: s.error }
      let cloud = {}
      if (s.sha) {
        const cur = await getTableRaw(table)
        if (cur.error) return { error: cur.error }
        cloud = cur.rows || {}
      }
      const merged = mergeById(cloud, rows)
      const put = await putTable(table, merged, s.sha, `sync(${table}): upsert ${rows.length} rows`)
      if (put.error && put.status === 409 && attempt === 0) continue
      return { error: put.error }
    }
    return { error: errObj(`tables/${table}.json: 409 冲突重试后仍失败`) }
  } catch (e) {
    return { error: errObj(`tables/${table}.json: ${e && e.message ? e.message : String(e)}`) }
  }
}

async function select(table) {
  try {
    const r = await getTableRaw(table)
    if (r.error) return { data: null, error: r.error }
    return { data: r.rows ? Object.values(r.rows) : [], error: null }
  } catch (e) {
    return { data: null, error: errObj(`tables/${table}.json: ${e && e.message ? e.message : String(e)}`) }
  }
}

export const githubClient = {
  from(table) {
    return {
      // sync.js push 只用 { onConflict: 'id' }（GitHub 按 id 天然幂等，忽略该参数）
      upsert(rows /*, opts */) { return upsert(table, rows) },
      select(/* cols */) { return select(table) }
    }
  }
}
