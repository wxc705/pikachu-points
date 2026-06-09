// 音效播放（v2）
// 优先：真 wav（public/sounds/*.wav，通过 fetch + decodeAudioData）
// 回退：Web Audio 合成 beep
// 安卓 Chrome 限制：AudioContext 需用户手势后才能 resume

const SOUNDS = {
 coin: '/sounds/coin.wav',
 levelup: '/sounds/levelup.wav',
 success: '/sounds/success.wav',
 milestone: '/sounds/milestone.wav',
 error: null // error 没 wav，回退到合成
}

let _ctx = null
let _unlocked = false
const _buffers = new Map() // 缓存已 decode 的 wav

function getCtx() {
 if (_ctx) return _ctx
 const AudioCtx = window.AudioContext || window.webkitAudioContext
 if (!AudioCtx) return null
 _ctx = new AudioCtx()
 return _ctx
}

export function unlockAudio() {
 if (_unlocked) return
 const ctx = getCtx()
 if (ctx && ctx.state === 'suspended') {
 ctx.resume().catch(() => {})
 }
 _unlocked = true
 // 触发一次空的 source 让 iOS/Safari 标记为已解锁
 try {
 const osc = ctx.createOscillator()
 const gain = ctx.createGain()
 gain.gain.value = 0
 osc.connect(gain).connect(ctx.destination)
 osc.start()
 osc.stop(ctx.currentTime + 0.001)
 } catch (e) { /* 静默 */ }
}

async function loadBuffer(name) {
 if (_buffers.has(name)) return _buffers.get(name)
 const url = SOUNDS[name]
 if (!url) return null
 try {
 const ctx = getCtx()
 if (!ctx) return null
 const res = await fetch(url)
 if (!res.ok) return null
 const ab = await res.arrayBuffer()
 const buf = await ctx.decodeAudioData(ab)
 _buffers.set(name, buf)
 return buf
 } catch (e) {
 console.warn('[sound] load failed:', name, e)
 return null
 }
}

function playBuffer(buf) {
 if (!buf) return false
 try {
 const ctx = getCtx()
 if (!ctx) return false
 const src = ctx.createBufferSource()
 const gain = ctx.createGain()
 gain.gain.value = 0.6
 src.buffer = buf
 src.connect(gain).connect(ctx.destination)
 src.start()
 return true
 } catch (e) { return false }
}

// ---- 合成回退（如果 wav 加载失败） ----
function playBeep(freq, dur, type = 'sine', volume = 0.15) {
 try {
 const ctx = getCtx()
 if (!ctx) return
 const osc = ctx.createOscillator()
 const gain = ctx.createGain()
 osc.frequency.value = freq
 osc.type = type
 gain.gain.setValueAtTime(0.0001, ctx.currentTime)
 gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02)
 gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
 osc.connect(gain).connect(ctx.destination)
 osc.start()
 osc.stop(ctx.currentTime + dur + 0.05)
 } catch (e) {}
}

function playSynth(name) {
 switch (name) {
 case 'coin':
 playBeep(1320, 0.08, 'sine', 0.2)
 setTimeout(() => playBeep(1760, 0.08, 'sine', 0.2), 50)
 break
 case 'levelup':
 for (let i = 0; i < 4; i++) {
 setTimeout(() => playBeep(523 + i * 110, 0.15, 'triangle', 0.18), i * 130)
 }
 break
 case 'success':
 for (let i = 0; i < 3; i++) {
 setTimeout(() => playBeep([880, 1175, 1568][i], 0.18, 'square', 0.16), i * 150)
 }
 break
 case 'milestone':
 for (let i = 0; i < 4; i++) {
 setTimeout(() => playBeep([392, 523, 659, 1047][i], 0.3, 'sine', 0.18), i * 200)
 }
 break
 case 'error':
 playBeep(220, 0.25, 'square', 0.18)
 break
 }
}

// ---- 公共 API：playCoin() 等 ----
export async function playCoin() {
 const buf = await loadBuffer('coin')
 if (!playBuffer(buf)) playSynth('coin')
}

export async function playLevelup() {
 const buf = await loadBuffer('levelup')
 if (!playBuffer(buf)) playSynth('levelup')
}

export async function playSuccess() {
 const buf = await loadBuffer('success')
 if (!playBuffer(buf)) playSynth('success')
}

export async function playMilestone() {
 const buf = await loadBuffer('milestone')
 if (!playBuffer(buf)) playSynth('milestone')
}

export function playError() {
 // error 只有合成
 playSynth('error')
}
