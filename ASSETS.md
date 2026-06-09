# 皮卡丘积分系统 — 素材资源清单

## 一、图标库（开源免费）

### Lucide Icons（推荐）
- **网址**：https://lucide.dev/icons/
- **许可**：ISC（免费商用，无需署名）
- **图标数量**：1714个
- **特点**：简洁现代，适合儿童应用

#### 推荐图标映射

**分类图标：**
| 分类 | 图标名称 | 说明 |
|------|----------|------|
| 饮食 | `utensils-crossed` | 餐具 |
| 饮食备选 | `apple` | 苹果 |
| 运动 | `dumbbell` | 哑铃 |
| 运动备选 | `running` | 跑步 |
| 学习 | `book-open` | 打开的书 |
| 学习备选 | `graduation-cap` | 毕业帽 |
| 生活习惯 | `home` | 家 |
| 生活习惯备选 | `sparkles` | 闪光 |
| 家长评价 | `star` | 星星 |
| 家长评价备选 | `heart` | 心形 |

**导航图标：**
| 用途 | 图标名称 | 说明 |
|------|----------|------|
| 打卡 | `check-circle` | 勾选圆圈 |
| 兑换 | `gift` | 礼物 |
| 历史 | `clock` | 时钟 |
| 评分 | `star` | 星星 |
| 设置 | `settings` | 齿轮 |

**徽章图标：**
| 用途 | 图标名称 | 说明 |
|------|----------|------|
| 连续3天 | `flame` | 火焰 |
| 连续5天 | `zap` | 闪电 |
| 连续7天 | `rainbow` | 彩虹 |
| 里程碑 | `trophy` | 奖杯 |

### 备选图标库

**Phosphor Icons**
- 网址：https://phosphoricons.com/
- 许可：MIT（免费商用）
- 特点：有6种粗细，更灵活

**Heroicons**
- 网址：https://heroicons.com/
- 许可：MIT（免费商用）
- 特点：Bootstrap团队出品，质量高

---

## 二、音效资源

### Freesound.org（推荐）
- **网址**：https://freesound.org/
- **许可**：CC0（免费商用，无需署名）或 CC-BY（需署名）
- **搜索关键词**：`coin collect game`, `level up`, `success`

#### 推荐音效

**打卡音效（coin.mp3）：**
- 搜索：`coin collect`, `pickup coin`, `8-bit coin`
- 时长：0.3-0.5秒
- 风格：清脆、短促

**升级音效（levelup.mp3）：**
- 搜索：`level up`, `power up`, `achievement`
- 时长：0.8-1.5秒
- 风格：欢快、上升感

**兑换成功（success.mp3）：**
- 搜索：`success`, `win`, `victory`, `fanfare`
- 时长：1-2秒
- 风格：庆祝、明亮

**里程碑音效（milestone.mp3）：**
- 搜索：`fanfare`, `celebration`, `trophy`
- 时长：1.5-2秒
- 风格：庄重、成就感

### Mixkit.co（备选）
- **网址**：https://mixkit.co/free-sound-effects/
- **许可**：免费商用，无需署名
- **优点**：音质高，分类清晰

### 游戏音效包
- **Kenney.nl**：https://kenney.nl/assets/category:Audio
- **许可**：CC0（完全免费）
- **优点**：完整的游戏音效包，风格统一

---

## 三、Lottie动画（可选）

### LottieFiles
- **网址**：https://lottiefiles.com/
- **许可**：部分免费，需查看具体动画的授权
- **推荐动画**：
  - 金币飞出动画
  - 星星闪烁
  - 庆祝彩带

### 免费Lottie资源
- **搜索关键词**：`coin`, `star`, `celebration`, `fireworks`
- **筛选**：Free + Attribution / CC0

---

## 四、配色方案

### 奥特曼主题（用户自定义）
| 元素 | 颜色代码 | 说明 |
|------|----------|------|
| 主色 | #E53935 | 奥特曼红 |
| 次色 | #BDBDBD | 奥特曼银 |
| 强调色 | #FFD600 | 金色 |
| 背景 | #FAFAFA | 浅灰白 |
| 文字 | #212121 | 深灰 |

### 备选主题
**皮卡丘主题：**
| 元素 | 颜色代码 |
|------|----------|
| 主色 | #FFC107 | 皮卡丘黄 |
| 次色 | #212121 | 黑色 |
| 强调色 | #E53935 | 腮红红 |
| 背景 | #FFFDE7 | 浅黄 |

**汪汪队主题：**
| 元素 | 颜色代码 |
|------|----------|
| 主色 | #1E88E5 | 汪汪队蓝 |
| 次色 | #E53935 | 红色 |
| 强调色 | #FFC107 | 黄色 |
| 背景 | #E3F2FD | 浅蓝 |

---

## 五、使用建议

### 图标使用方式

**方式A：直接使用SVG**
```vue
<template>
  <lucide-icon name="check-circle" :size="24" />
</template>
```

**方式B：下载PNG**
- 从Lucide网站下载
- 放入 `public/icons/` 目录
- 在Vue中使用 `<img src="/icons/check-circle.png" />`

### 音效使用方式

**Web Audio API（当前实现）：**
```javascript
// 使用合成音效，无需外部文件
const audioCtx = new AudioContext()
// ... 播放逻辑
```

**外部文件方式：**
```javascript
// 加载外部音效文件
const coinSound = new Audio('/sounds/coin.mp3')
coinSound.play()
```

---

## 六、下载清单

### 必须下载
- [ ] Lucide图标（SVG格式）— 分类图标5个 + 导航图标5个
- [ ] 打卡音效（coin.mp3）
- [ ] 升级音效（levelup.mp3）

### 建议下载
- [ ] 兑换成功音效（success.mp3）
- [ ] 里程碑音效（milestone.mp3）
- [ ] 徽章图标（flame, zap, rainbow, trophy）

### 可选下载
- [ ] Lottie动画（金币飞出、庆祝）
- [ ] 背景装饰SVG

---

*最后更新：2026-06-09*
