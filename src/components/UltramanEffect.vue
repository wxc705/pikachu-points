<template>
 <Teleport to="body">
 <div class="ultraman-overlay" @click="onClick">
 <div class="ultraman-rays"></div>
 <img
 class="ultraman-image"
 :src="imgSrc"
 :alt="`奥特曼 Lv.${level}`"
 @click.stop
 @error="onImgError"
 />
 <div class="ultraman-text">兑换成功！</div>
 </div>
 </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { playSuccess } from '../services/sound.js'

const props = defineProps({
 level: { type: Number, default: 1, validator: (v) => v >= 1 && v <= 5 }
})
const emit = defineEmits(['done'])

const imgSrc = computed(() => {
 const lv = Math.min(5, Math.max(1, props.level || 1))
 return `./ultraman/level${lv}.png`
})

const imgErrored = ref(false)
function onImgError() {
 imgErrored.value = true
}

function onClick() {
 emit('done')
}

let timer = null
onMounted(() => {
 playSuccess()
 // 2 秒后自动关闭（避免蒙层长时间遮挡后续操作）
 timer = setTimeout(() => emit('done'), 2000)
})

onBeforeUnmount(() => {
 if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.ultraman-overlay {
 position: fixed;
 inset: 0;
 z-index: 60;
 display: flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 /* 半透明黑色遮罩：保持背景可隐约看到 */
 background: rgba(0, 0, 0, 0.7);
 backdrop-filter: blur(2px);
 overflow: hidden;
 cursor: pointer;
 animation: ultraman-fade-in 400ms ease-out;
}

@keyframes ultraman-fade-in {
 from { opacity: 0; }
 to { opacity: 1; }
}

/* 背景金色光线（仍保留氛围） */
.ultraman-rays {
 position: absolute;
 width: 200vmax;
 height: 200vmax;
 background: conic-gradient(
 from 0deg,
 transparent 0deg,
 rgba(255, 220, 50, 0.15) 8deg,
 transparent 16deg,
 transparent 30deg,
 rgba(255, 220, 50, 0.15) 38deg,
 transparent 46deg,
 transparent 60deg,
 rgba(255, 220, 50, 0.15) 68deg,
 transparent 76deg,
 transparent 90deg,
 rgba(255, 220, 50, 0.15) 98deg,
 transparent 106deg,
 transparent 120deg,
 rgba(255, 220, 50, 0.15) 128deg,
 transparent 136deg,
 transparent 150deg,
 rgba(255, 220, 50, 0.15) 158deg,
 transparent 166deg,
 transparent 180deg,
 rgba(255, 220, 50, 0.15) 188deg,
 transparent 196deg,
 transparent 210deg,
 rgba(255, 220, 50, 0.15) 218deg,
 transparent 226deg,
 transparent 240deg,
 rgba(255, 220, 50, 0.15) 248deg,
 transparent 256deg,
 transparent 270deg,
 rgba(255, 220, 50, 0.15) 278deg,
 transparent 286deg,
 transparent 300deg,
 rgba(255, 220, 50, 0.15) 308deg,
 transparent 316deg,
 transparent 330deg,
 rgba(255, 220, 50, 0.15) 338deg,
 transparent 346deg,
 transparent 360deg
 );
 animation: ultraman-spin 10s linear infinite;
 filter: blur(2px);
 pointer-events: none;
}
@keyframes ultraman-spin {
 to { transform: rotate(360deg); }
}

/* 奥特曼图片：从 0 放大到 100% */
.ultraman-image {
 position: relative;
 z-index: 1;
 max-width: 60vw;
 max-height: 60vh;
 width: auto;
 height: auto;
 object-fit: contain;
 filter: drop-shadow(0 0 30px rgba(255, 220, 50, 0.6));
 animation: ultraman-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
 pointer-events: none;
}
@keyframes ultraman-pop {
 0% { transform: scale(0); opacity: 0; }
 60% { transform: scale(1.08); opacity: 1; }
 100% { transform: scale(1); opacity: 1; }
}

/* 金色"兑换成功！" */
.ultraman-text {
 position: relative;
 z-index: 1;
 margin-top: 24px;
 font-size: 64px;
 font-weight: 900;
 letter-spacing: 4px;
 color: #ffd700;
 text-shadow:
 0 0 20px #ffeb3b,
 0 0 40px #ff9800,
 0 0 60px #c0392b,
 0 4px 12px rgba(0, 0, 0, 0.6);
 animation: ultraman-text-in 600ms ease-out 300ms both;
 pointer-events: none;
}
@keyframes ultraman-text-in {
 from { opacity: 0; transform: scale(0.6); }
 to { opacity: 1; transform: scale(1); }
}
</style>
