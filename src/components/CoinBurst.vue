<template>
 <Teleport to="body">
 <span
 v-for="coin in coins"
 :key="coin.id"
 class="coin-fly fixed pointer-events-none"
 :style="coinStyle(coin)"
 >
 <span class="coin-disc">¥</span>
 </span>
 </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
 x: { type: Number, required: true },
 y: { type: Number, required: true },
 count: { type: Number, default:5 }
})

const emit = defineEmits(['done'])

//5 个金币沿水平方向均匀扇形展开，主要向上飞 ~120px
const coins = []
const total = props.count
for (let i =0; i < total; i++) {
 const spread = (i - (total -1) /2) *22
 coins.push({
 id: i,
 baseX: props.x -12,
 baseY: props.y -12,
 tx: spread,
 ty: -120,
 delay: i *25
 })
}

function coinStyle(c) {
 return {
 left: c.baseX + 'px',
 top: c.baseY + 'px',
 '--tx': c.tx + 'px',
 '--ty': c.ty + 'px',
 animationDelay: c.delay + 'ms'
 }
}

let timer = null
onMounted(() => {
 timer = setTimeout(() => emit('done'),900)
})
onBeforeUnmount(() => {
 if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.coin-fly {
 width:24px;
 height:24px;
 z-index:50;
 animation: coin-fly800ms ease-out forwards;
}

.coin-disc {
 display: flex;
 align-items: center;
 justify-content: center;
 width:100%;
 height:100%;
 background: #fde047;
 border:2px solid #ca8a04;
 border-radius:50%;
 color: #92400e;
 font-weight:800;
 font-size:12px;
 box-shadow:02px4px rgba(0,0,0,0.2);
}

@keyframes coin-fly {
0% {
 transform: translate(0,0) scale(1);
 opacity:1;
 }
70% {
 opacity:1;
 }
100% {
 transform: translate(var(--tx), var(--ty)) scale(0.6);
 opacity:0;
 }
}
</style>
