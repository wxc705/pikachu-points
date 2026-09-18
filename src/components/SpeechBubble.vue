<template>
  <Teleport to="body">
    <Transition name="bubble">
      <div v-if="visible" class="speech-bubble">
        <span class="sb-emoji">{{ emoji }}</span>
        <span class="sb-text">{{ text }}</span>
        <div class="sb-tail"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  emoji: { type: String, default: '⭐' },
  trigger: { type: Number, default: 0 },
  duration: { type: Number, default: 2000 }
})

const visible = ref(false)
let _timer = null

watch(() => props.trigger, () => {
  if (_timer) clearTimeout(_timer)
  visible.value = true
  _timer = setTimeout(() => {
    visible.value = false
    _timer = null
  }, props.duration)
})
</script>

<style>
/* 全局样式（Teleport 到 body，不能 scoped） */
.speech-bubble {
  position: fixed;
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #ffffff;
  border: 3px solid #ffb627;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(255, 183, 39, 0.25);
  font-family: 'DM Sans', system-ui, sans-serif;
  pointer-events: none;
}
.sb-emoji { font-size: 36px; line-height: 1; }
.sb-text { font-size: 22px; font-weight: 700; color: #222; white-space: nowrap; }
.sb-tail {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 12px solid #ffb627;
}

/* 进退场动画 */
.bubble-enter-active { animation: bubble-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble-leave-active { animation: bubble-out 300ms ease-in; }
@keyframes bubble-in {
  0% { opacity: 0; transform: translateX(-50%) scale(0.3) translateY(20px); }
  100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
}
@keyframes bubble-out {
  0% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(-10px); }
}
</style>
