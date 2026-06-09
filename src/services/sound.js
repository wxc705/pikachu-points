// Web Audio API 合成音效
// 设计文档 §六 指定：音效 = Web Audio API（合成）
// 设计文档 §七 列出：coin / levelup / success / milestone
// 安卓 Chrome 限制：AudioContext 需用户手势后才能 resume（首次点击任意位置解锁）

let _ctx = null
let _unlocked = false

function getCtx() {
 if (_ctx) return _ctx
 try {
 const Ctx = window.AudioContext || window.webkitAudioContext
 if (!Ctx) return null
 _ctx = new Ctx()
 } catch (e) {
 return null
 }
 return _ctx
}

// 用户首次手势后调用一次解锁
export function unlockAudio() {
 const ctx = getCtx()
 if (!ctx) return
 if (ctx.state === 'suspended') {
 ctx.resume().then(() => { _unlocked = true }).catch(() => {})
 } else {
 _unlocked = true
 }
}

function tone({ freq, duration = 0.1, type = 'sine', volume = 0.2, attack = 0.005, release = 0.05, startOffset = 0 }) {
 const ctx = getCtx()
 if (!ctx) return
 if (ctx.state === 'suspended' && !_unlocked) return // 没解锁就静默
 const t0 = ctx.currentTime + startOffset
 const osc = ctx.createOscillator()
 const gain = ctx.createGain()
 osc.type = type
 osc.frequency.setValueAtTime(freq, t0)
 gain.gain.setValueAtTime(0, t0)
 gain.gain.linearRampToValueAtTime(volume, t0 + attack)
 gain.gain.setValueAtTime(volume, t0 + duration - release)
 gain.gain.linearRampToValueAtTime(0, t0 + duration)
 osc.connect(gain)
 gain.connect(ctx.destination)
 osc.start(t0)
 osc.stop(t0 + duration + 0.01)
}

// 金币叮：单频短促（checkin 时）
export function playCoin() {
 tone({ freq: 1320, duration: 0.08, type: 'sine', volume: 0.18 })
 tone({ freq: 1760, duration: 0.1, type: 'sine', volume: 0.15, startOffset: 0.06 })
}

// 升级（levelup）：4 拍上升 524→659→784→1047
export function playLevelup() {
 tone({ freq: 523, duration: 0.12, type: 'triangle', volume: 0.18, startOffset: 0 })
 tone({ freq: 659, duration: 0.12, type: 'triangle', volume: 0.18, startOffset: 0.12 })
 tone({ freq: 784, duration: 0.12, type: 'triangle', volume: 0.18, startOffset: 0.24 })
 tone({ freq: 1047, duration: 0.25, type: 'triangle', volume: 0.22, startOffset: 0.36 })
}

// 兑换成功：3 短促上升（success）
export function playSuccess() {
 tone({ freq: 880, duration: 0.09, type: 'sine', volume: 0.18, startOffset: 0 })
 tone({ freq: 1175, duration: 0.09, type: 'sine', volume: 0.18, startOffset: 0.1 })
 tone({ freq: 1568, duration: 0.18, type: 'sine', volume: 0.2, startOffset: 0.2 })
}

// 里程碑：4 拍庄重（大三角波）
export function playMilestone() {
 tone({ freq: 392, duration: 0.15, type: 'triangle', volume: 0.18, startOffset: 0 })
 tone({ freq: 523, duration: 0.15, type: 'triangle', volume: 0.18, startOffset: 0.15 })
 tone({ freq: 659, duration: 0.15, type: 'triangle', volume: 0.2, startOffset: 0.3 })
 tone({ freq: 1047, duration: 0.4, type: 'triangle', volume: 0.24, startOffset: 0.45 })
}

// 错误：低频短促
export function playError() {
 tone({ freq: 220, duration: 0.18, type: 'square', volume: 0.15 })
}
