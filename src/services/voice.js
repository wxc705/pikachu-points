// voice.js — TTS 语音鼓励服务
// 使用 Web Speech API，零依赖

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

// 鼓励语库（中英文混合，6 岁孩子听得懂）
const ENCOURAGEMENTS = [
  '太棒了！', '真厉害！', '好样的！', '你做到了！', '超级棒！',
  '厉害了我的宝！', '你是小天才！', '完美！',
  '挖到钻石了！', '经验值加一！', '升级啦！', '获得成就！',
  '奥特曼为你骄傲！', '能量满满！', '战斗力提升！',
  'Excellent!', 'Amazing!', 'Super star!', 'You rock!',
  'Level up!', 'So cool!', 'Wonderful!'
]

const ALL_DONE = [
  '全部完成！你就是今天的超级英雄！',
  '太厉害了！所有任务都完成了！',
  '全勤达成！你是最棒的小朋友！',
  '恭喜通关！今天的表现一百分！',
  '完美全勤！奥特曼都为你鼓掌！',
  'All tasks done! You are incredible!'
]

// 已说过的语句索引（避免连续重复）
let _lastIdx = -1
let _lastAllDoneIdx = -1

function pickRandom(arr, excludeIdx) {
  if (arr.length === 0) return { text: '', idx: -1 }
  if (arr.length === 1) return { text: arr[0], idx: 0 }
  let idx
  do {
    idx = Math.floor(Math.random() * arr.length)
  } while (idx === excludeIdx)
  return { text: arr[idx], idx }
}

function speak(text) {
  if (!synth || !text) return
  synth.cancel() // 取消上一条，防止语音叠加
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 1.1    // 稍快，孩子注意力短
  utter.pitch = 1.3   // 稍高音，更活泼
  utter.volume = 1.0
  synth.speak(utter)
}

// 预热引擎（首次用户交互时调用，解锁 iOS Safari）
export function warmUpVoice() {
  if (!synth) return
  const utter = new SpeechSynthesisUtterance('')
  utter.volume = 0
  synth.speak(utter)
}

// 打卡鼓励：随机选一条，返回文字（供气泡显示）
export function speakEncouragement() {
  const { text, idx } = pickRandom(ENCOURAGEMENTS, _lastIdx)
  _lastIdx = idx
  speak(text)
  return text
}

// 全勤鼓励：随机选全勤语，返回文字
export function speakAllDone() {
  const { text, idx } = pickRandom(ALL_DONE, _lastAllDoneIdx)
  _lastAllDoneIdx = idx
  speak(text)
  return text
}

// 播报自定义文字
export function speakText(text) {
  speak(text)
}
