// 生成 PWA 图标
// 192 / 512 / 180(apple) 三个尺寸
// 设计:黄底圆角 + 大闪电 emoji ⚡ + "皮卡丘"文字
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public')
fs.mkdirSync(outDir, { recursive: true })

// 黄色背景 + 大闪电符号
// 用 SVG 做底
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
 <defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#fde047"/>
 <stop offset="1" stop-color="#fbbf24"/>
 </linearGradient>
 </defs>
 <rect width="${size}" height="${size}" rx="${size * 0.18}" ry="${size * 0.18}" fill="url(#bg)"/>
 <text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle"
 font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif"
 font-size="${size * 0.6}" fill="#7c2d12">⚡</text>
</svg>`

const targets = [
 { name: 'pwa-192x192.png', size: 192 },
 { name: 'pwa-512x512.png', size: 512 },
 { name: 'apple-touch-icon.png', size: 180 },
 { name: 'favicon.png', size: 64 }
]

for (const t of targets) {
 const buf = await sharp(Buffer.from(svg(t.size)))
 .png()
 .toBuffer()
 fs.writeFileSync(path.join(outDir, t.name), buf)
 console.log(`✓ ${t.name} (${t.size}x${t.size})`)
}
console.log('done')
