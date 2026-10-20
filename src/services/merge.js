// 纯函数数据映射 / 合并核心（B1）
// 约束：不 import Vue / idb / fetch，Node 与浏览器都能直接跑（B7 单测就靠这点）。
// 六张同步表的「本地 camelCase ↔ 云端 snake_case」只在这里定义一次；
// push、pull、githubSync、seed-cloud、LAN 服务器都必须通过本文件映射，禁止各自再写一遍。

export const SYNC_TABLE_KEYS = ['checkins', 'exchange_requests', 'projects', 'weekly_tasks', 'daily_homework', 'daily_checkins']

// fields: [本地字段, 云端字段, 类型?]；'ts' = 毫秒时间戳（云端写 ISO，读入统一转毫秒）
const TABLE_MAPS = {
  checkins: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['taskId', 'task_id'],
      ['projectId', 'project_id'],
      ['projectName', 'project_name'],
      ['category', 'category'],
      ['pointsEarned', 'points_earned'],
      ['note', 'note'],
      ['checkedBy', 'checked_by'],
      ['date', 'date'],
      ['createdAt', 'created_at', 'ts'],
      ['homeworkId', 'homework_id'],
      ['homeworkIndex', 'homework_index'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { taskId: null, homeworkId: null, homeworkIndex: null }
  },
  exchange_requests: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['reward', 'reward'],
      ['pointsCost', 'points_cost'],
      ['note', 'note'],
      ['status', 'status'],
      ['viewed', 'viewed'],
      ['date', 'date'],
      ['createdAt', 'created_at', 'ts'],
      ['decidedAt', 'decided_at', 'ts'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { viewed: false }
  },
  projects: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['category', 'category'],
      ['name', 'name'],
      ['points', 'points'],
      ['pointRange', 'point_range'],
      ['sortOrder', 'sort_order'],
      ['isActive', 'is_active'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { isActive: true }
  },
  weekly_tasks: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['weekday', 'weekday'],
      ['timeSlot', 'time_slot'],
      ['name', 'name'],
      ['points', 'points'],
      ['category', 'category'],
      ['sortOrder', 'sort_order'],
      ['isActive', 'is_active'],
      ['once', 'once'],
      ['skips', 'skips'],
      // C2 可选备注：老行/留空时键不存在 → toCloud/fromCloud 自动跳过，零迁移
      ['bookNote', 'book_note'],
      ['pickupNote', 'pickup_note'],
      ['createdAt', 'created_at', 'ts'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { isActive: true, once: null, skips: [] }
  },
  daily_homework: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['date', 'date'],
      ['tasks', 'tasks'],
      ['source', 'source'],
      ['createdAt', 'created_at', 'ts'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { tasks: [] }
  },
  daily_checkins: {
    key: 'uid',
    timestamp: 'updatedAt',
    fields: [
      ['uid', 'uid'],
      ['id', 'id'],
      ['legacyId', 'legacy_id'],
      ['date', 'date'],
      ['taskId', 'task_id'],
      ['taskName', 'task_name'],
      ['category', 'category'],
      ['points', 'points'],
      ['completedAt', 'completed_at', 'ts'],
      ['checkedBy', 'checked_by'],
      ['createdAt', 'created_at', 'ts'],
      ['updatedAt', 'updated_at', 'ts'],
      ['deletedAt', 'deleted_at', 'ts']
    ],
    defaults: { taskId: null, completedAt: 0, checkedBy: 'kid' }
  }
}

// 唯一的行映射表；调用方拿到的就是本文件里的定义（不要再抄一份）
export function pickRowMap(table) {
  const spec = TABLE_MAPS[table]
  if (!spec) throw new Error(`[merge] 未知表: ${table}`)
  return spec
}

// 时间统一为毫秒数；缺省/非法 = 0（B1 规定 updatedAt 缺省视为 0）
export function tsOf(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v instanceof Date) {
    const t = v.getTime()
    return Number.isFinite(t) ? t : 0
  }
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return t
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function rowUid(row) {
  if (!row || typeof row !== 'object') return ''
  const v = row.uid ?? row.id ?? row.legacyId
  return v == null || v === '' ? '' : String(v)
}

export function isTombstoned(row) {
  if (!row || typeof row !== 'object') return false
  return tsOf(row.deletedAt ?? row.deleted_at) > 0
}

// 写墓碑（不物理删）：删除时间 + updatedAt 至少推进到删除时刻，供 push 回传
export function applyTombstone(row, deletedAt = Date.now()) {
  const d = tsOf(deletedAt) || Date.now()
  return {
    ...(row || {}),
    deletedAt: d,
    updatedAt: Math.max(tsOf(row && row.updatedAt), d)
  }
}

function tsToIso(v) {
  const t = tsOf(v)
  return t > 0 ? new Date(t).toISOString() : undefined
}

// 云端行 → 本地行（camelCase、毫秒时间戳、id 与 uid 对齐）
export function fromCloud(table, cloudRow) {
  const spec = pickRowMap(table)
  if (!cloudRow || typeof cloudRow !== 'object') return null
  const out = {}
  for (const [local, cloud, type] of spec.fields) {
    let v = cloudRow[cloud]
    if (v === undefined) v = cloudRow[local] // 容错：本地形状也可进（github mergeById 的入参）
    if (v === undefined) v = spec.defaults ? spec.defaults[local] : undefined
    if (v === undefined) continue
    out[local] = type === 'ts' ? tsOf(v) : v
  }
  // uid 是唯一主键；老云端行只有 id 时用 id 兜底
  const uid = String(cloudRow.uid ?? cloudRow.id ?? out.uid ?? out.id ?? '')
  if (uid) {
    out.uid = uid
    out.id = uid
  }
  if (out.legacyId != null) out.legacyId = out.legacyId
  return out
}

// 本地行 → 云端行（snake_case、ISO 时间戳）
export function toCloud(table, row) {
  const spec = pickRowMap(table)
  if (!row || typeof row !== 'object') return null
  const uid = rowUid(row)
  const out = {}
  if (uid) {
    out.uid = uid
    out.id = uid
  }
  if (row.legacyId != null) out.legacy_id = row.legacyId
  for (const [local, cloud, type] of spec.fields) {
    if (local === 'uid' || local === 'id' || local === 'legacyId') continue
    let v = row[local]
    if (v === undefined && spec.defaults) v = spec.defaults[local]
    if (v === undefined) continue
    if (type === 'ts') {
      const iso = tsToIso(v)
      if (iso !== undefined) out[cloud] = iso
    } else {
      out[cloud] = v
    }
  }
  if (!out.updated_at) out.updated_at = new Date().toISOString()
  return out
}

// 兼容旧云端行：没有 uid 的老行（只有自增 id）优先认领本地同 legacyId 的行，
// 避免「设备已迁移 uuid、云端还是旧 id」时同一行业务上被当成两行。
function canonicalCloudRow(table, raw, legacyToUid) {
  const row = fromCloud(table, raw)
  if (!row) return null
  const rawHadUid = raw.uid != null && raw.uid !== ''
  if (!rawHadUid) {
    const legacyKey = raw.legacy_id != null ? String(raw.legacy_id) : (raw.id != null ? String(raw.id) : '')
    const mapped = legacyKey ? legacyToUid.get(legacyKey) : null
    if (mapped) {
      row.uid = mapped
      row.id = mapped
    }
  }
  return row
}

function canonicalLocalRow(table, raw) {
  return fromCloud(table, raw)
}

// 按 uid 合并：
// - 同 uid → updatedAt 新者赢；相等保留本地
// - 云端墓碑 → 本地写 deletedAt（不物理删）
// - 本地独有 → 保留（并集；空云端/读取失败绝不会清本地）
// 返回 { rows, stats:{ added, updated, deleted, conflictKeptLocal } }
export function mergeRows(table, localRows, cloudRows, tombstones = []) {
  pickRowMap(table) // 表名校验
  const stats = { added: 0, updated: 0, deleted: 0, conflictKeptLocal: 0 }
  const localList = (localRows || []).map((r) => canonicalLocalRow(table, r)).filter(Boolean)
  const out = new Map()
  const legacyToUid = new Map()

  for (const row of localList) {
    const uid = rowUid(row)
    if (!uid) continue
    out.set(uid, row)
    if (row.legacyId != null) legacyToUid.set(String(row.legacyId), uid)
  }

  const cloudRaw = cloudRows || []
  const cloudList = []
  for (const raw of cloudRaw) {
    const row = canonicalCloudRow(table, raw, legacyToUid)
    if (!row) continue
    const uid = rowUid(row)
    if (!uid) continue
    cloudList.push({ raw, row, uid })
  }

  // 云端墓碑优先落地（墓碑行可能混在 cloudRows 里，也可由参数单独传）
  const tombMap = new Map()
  for (const raw of [...(tombstones || []), ...cloudRaw]) {
    if (!isTombstoned(raw)) continue
    const row = canonicalCloudRow(table, raw, legacyToUid)
    if (!row) continue
    const uid = rowUid(row)
    if (!uid) continue
    const prev = tombMap.get(uid)
    if (!prev || tsOf(row.deletedAt) >= tsOf(prev.deletedAt)) tombMap.set(uid, row)
  }
  for (const [uid, tomb] of tombMap) {
    const deletedAt = tsOf(tomb.deletedAt) || Date.now()
    const existing = out.get(uid)
    if (existing) {
      if (!isTombstoned(existing) || deletedAt > tsOf(existing.deletedAt)) {
        out.set(uid, applyTombstone(existing, deletedAt))
        stats.deleted++
      }
    } else {
      const row = applyTombstone({ ...tomb, uid, id: uid }, deletedAt)
      out.set(uid, row)
      stats.deleted++
    }
  }

  // 非墓碑云端行：LWW 合并
  for (const { row, uid } of cloudList) {
    if (isTombstoned(row)) continue
    if (tombMap.has(uid)) continue // 同 uid 的云端墓碑优先于云端活行
    const prev = out.get(uid)
    if (!prev) {
      out.set(uid, row)
      stats.added++
      continue
    }
    const cTs = tsOf(row.updatedAt)
    const lTs = tsOf(prev.updatedAt)
    if (cTs > lTs) {
      out.set(uid, row)
      stats.updated++
    } else {
      stats.conflictKeptLocal++
    }
  }

  return { rows: [...out.values()], stats }
}
