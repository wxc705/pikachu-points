import { describe, it, expect } from 'vitest'
import {
  applyTombstone,
  fromCloud,
  isTombstoned,
  mergeRows,
  pickRowMap,
  toCloud,
  tsOf
} from '../src/services/merge.js'

const T0 = 1_700_000_000_000

function localCheckin(over = {}) {
  return {
    uid: 'uid-1', id: 'uid-1', taskId: null, projectId: 'p-1', projectName: '阅读',
    category: '阅读', pointsEarned: 5, note: 'n', checkedBy: 'kid',
    date: '2026-10-20', createdAt: T0, updatedAt: T0, ...over
  }
}

describe('B1 pickRowMap / 字段往返', () => {
  it('六张表都有映射，且包含已知漂移字段', () => {
    for (const t of ['checkins', 'exchange_requests', 'projects', 'weekly_tasks', 'daily_homework', 'daily_checkins']) {
      const fields = pickRowMap(t).fields.map(([local]) => local)
      expect(fields.length).toBeGreaterThan(0)
    }
    const ci = pickRowMap('checkins').fields
    expect(ci.some(([l, c]) => l === 'homeworkId' && c === 'homework_id')).toBe(true)
    expect(ci.some(([l, c]) => l === 'homeworkIndex' && c === 'homework_index')).toBe(true)
    const er = pickRowMap('exchange_requests').fields
    expect(er.some(([l, c]) => l === 'updatedAt' && c === 'updated_at')).toBe(true)
    const dc = pickRowMap('daily_checkins').fields
    expect(dc.some(([l, c]) => l === 'completedAt' && c === 'completed_at')).toBe(true)
  })

  it('checkins 的 homeworkId/homeworkIndex/subject/minutes/note 经 toCloud→fromCloud 不丢', () => {
    const local = localCheckin({ homeworkId: 'hw-1', homeworkIndex: 2, subject: '语文', minutes: 15 })
    const cloud = toCloud('checkins', local)
    expect(cloud.homework_id).toBe('hw-1')
    expect(cloud.homework_index).toBe(2)
    expect(cloud.updated_at).toBe(new Date(T0).toISOString())
    const back = fromCloud('checkins', cloud)
    expect(back.homeworkId).toBe('hw-1')
    expect(back.homeworkIndex).toBe(2)
    expect(back.note).toBe('n')
    expect(back.updatedAt).toBe(T0)
  })

  it('daily_homework.tasks 的 subject/minutes/note 原样往返', () => {
    const tasks = [{ name: '口算', points: 2, done: false, subject: '数学', minutes: 15, note: '周五交' }]
    const local = { uid: 'hw-1', id: 'hw-1', date: '2026-10-20', tasks, source: '家长录入', createdAt: T0, updatedAt: T0 + 5 }
    const back = fromCloud('daily_homework', toCloud('daily_homework', local))
    expect(back.tasks).toEqual(tasks)
    expect(back.updatedAt).toBe(T0 + 5)
  })
})

describe('B1/B7 合并语义', () => {
  it('1. 空云端 pull → 本地行数不减少（数据红线）', () => {
    const local = [localCheckin()]
    const { rows, stats } = mergeRows('checkins', local, [], [])
    expect(rows.length).toBe(1)
    expect(rows[0].uid).toBe('uid-1')
    expect(isTombstoned(rows[0])).toBe(false)
    expect(stats.added + stats.updated + stats.deleted).toBe(0)
  })

  it('2. 双设备同 uid 不同内容 → updatedAt 新者赢', () => {
    const local = [localCheckin({ note: '旧', updatedAt: T0 })]
    const cloudNew = [toCloud('checkins', localCheckin({ note: '新', updatedAt: T0 + 1000 }))]
    const winCloud = mergeRows('checkins', local, cloudNew, [])
    expect(winCloud.rows[0].note).toBe('新')
    expect(winCloud.stats.updated).toBe(1)

    const cloudOld = [toCloud('checkins', localCheckin({ note: '更旧', updatedAt: T0 - 1000 }))]
    const winLocal = mergeRows('checkins', local, cloudOld, [])
    expect(winLocal.rows[0].note).toBe('旧')
    expect(winLocal.stats.conflictKeptLocal).toBe(1)
  })

  it('3. 本地独有行不被云端删除（并集）', () => {
    const local = [localCheckin({ uid: 'local-only', id: 'local-only' }), localCheckin()]
    const cloud = [toCloud('checkins', localCheckin())]
    const { rows } = mergeRows('checkins', local, cloud, [])
    expect(rows.some((r) => r.uid === 'local-only')).toBe(true)
    expect(rows.length).toBe(2)
  })

  it('4. 云端墓碑 → 本地删除，且 push 会把墓碑回传', () => {
    const local = [localCheckin()]
    const tomb = { uid: 'uid-1', id: 'uid-1', deletedAt: T0 + 5000, updatedAt: T0 + 5000 }
    const { rows, stats } = mergeRows('checkins', local, [tomb], [])
    expect(stats.deleted).toBe(1)
    expect(isTombstoned(rows[0])).toBe(true)
    expect(rows[0].deletedAt).toBe(T0 + 5000)
    // 本地不会物理消失（push 要回传）
    expect(rows[0].projectName).toBe('阅读')
    const cloud = toCloud('checkins', rows[0])
    expect(tsOf(cloud.deleted_at)).toBe(T0 + 5000)
    expect(fromCloud('checkins', cloud).deletedAt).toBe(T0 + 5000)
  })

  it('4b. 本地墓碑不会被旧云端活行复活', () => {
    const local = [applyTombstone(localCheckin(), T0 + 2000)]
    const cloudOld = [toCloud('checkins', localCheckin({ updatedAt: T0 }))]
    const { rows } = mergeRows('checkins', local, cloudOld, [])
    expect(isTombstoned(rows[0])).toBe(true)
    expect(rows[0].deletedAt).toBe(T0 + 2000)
  })

  it('6. 审批状态 pending→approved 跨设备生效（updatedAt LWW）', () => {
    const pending = {
      uid: 'req-1', id: 'req-1', reward: '冰淇淋', pointsCost: 10, status: 'pending',
      viewed: false, date: '2026-10-20', createdAt: T0, updatedAt: T0
    }
    const approvedRemote = { ...pending, status: 'approved', decidedAt: T0 + 1000, updatedAt: T0 + 1000 }
    const cloud = [toCloud('exchange_requests', approvedRemote)]
    const { rows } = mergeRows('exchange_requests', [pending], cloud, [])
    expect(rows[0].status).toBe('approved')
    expect(rows[0].decidedAt).toBe(T0 + 1000)

    // 反方向：本机已是 approved，云端还是旧 pending → 本地赢
    const cloudOld = [toCloud('exchange_requests', pending)]
    const { rows: rows2 } = mergeRows('exchange_requests', [approvedRemote], cloudOld, [])
    expect(rows2[0].status).toBe('approved')
  })

  it('本地墓碑 push 后云端 pull 到另一台设备同样删除', () => {
    const localB = [applyTombstone(localCheckin({ uid: 'uid-1', id: 'uid-1' }), T0 + 3000)]
    const pushed = toCloud('checkins', localB[0])
    // 设备 A 没有这行 → 墓碑行应被加入，供后续 push 回传
    const { rows, stats } = mergeRows('checkins', [], [pushed], [])
    expect(stats.deleted).toBe(1)
    expect(isTombstoned(rows[0])).toBe(true)
    expect(toCloud('checkins', rows[0]).deleted_at).toBeTruthy()
  })

  it('老云端行无 uid 时按 legacyId 认领本地迁移行，不当成新行', () => {
    const local = [{ ...localCheckin(), uid: 'new-uuid', id: 'new-uuid', legacyId: 7 }]
    const oldCloud = [{
      id: 7, project_id: 'p-1', project_name: '云端旧行', category: '阅读', points_earned: 5,
      note: 'n', checked_by: 'kid', date: '2026-10-20', created_at: new Date(T0).toISOString()
    }]
    const { rows, stats } = mergeRows('checkins', local, oldCloud, [])
    expect(rows.length).toBe(1)
    expect(rows[0].uid).toBe('new-uuid')
    expect(stats.added).toBe(0)
  })
})
