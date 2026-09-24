# 待办：皮卡丘积分系统 — 数据同步（Supabase）修复

> 状态：**✅ 已解决（方案D：本机 PostgREST 垫片，2026-09-23 落地）** ｜ 优先级：P1 ｜ 创建：2026-09-19 ｜ 负责：Hardison
>
> **现象确认（2026-09-19 实测）**：
> - `https://supabase.com` 官网 → HTTP 200 ✅ 通
> - `https://bssezchnpxcstfunerhn.supabase.co`（项目域名）→ `curl` 返回 `000`，
>   报错 `schannel: failed to receive handshake, SSL/TLS connection failed` ❌
> - DNS 能解析（104.18.38.10 / 172.64.149.246 Cloudflare），但 TLS 握手被掐断 = **SNI 阻断（GFW），确认被墙**
> - 本机无系统代理（`netsh winhttp show proxy` = Direct access）
>
> **影响**：家长端↔iPad 儿童端跨设备同步不可用，云同步按钮会报
> "❌ 推送失败/同步失败"。**这是预期网络行为，不是代码 bug**（skill 已记录）。
> 同设备（家长端+儿童端同浏览器）走 IndexedDB 完全正常，不影响单机使用。
>
> **同步表清单已收敛（2026-09-22，随本文件一起入库）**：`sync.js` 现在同步 **6 张表**：
> `checkins` / `exchange_requests` / `projects` / `daily_homework` / **`weekly_tasks`** / **`daily_checkins`**。
> 旧 `weekly_plan` 已从同步里移除（周计划页入口已下线，两个儿童端统一读 `weekly_tasks`）。

---

## 方案A：Cloudflare Worker 反代 Supabase（推荐，免VPN全局可用）

**原理**：Workers 从境外侧访问 Supabase，家人直连 Worker 域名（Cloudflare 域名国内一般可通）。

### 操作流程
1. **注册/登录 Cloudflare**：浏览器打开 https://dash.cloudflare.com → 登录（没有账号先注册，免费版够用）
2. **创建 Worker**：
   - 左侧菜单 `Workers & Pages` → `Create` → `Create Worker` → 起名 `pikachu-supabase` → `Deploy`
   - 点 `Edit code`，把模板全部删掉，粘贴下面的反代代码：
   ```js
   export default {
     async fetch(request, env) {
       const origin = 'https://bssezchnpxcstfunerhn.supabase.co'
       const url = new URL(request.url)
       url.host = new URL(origin).host
       const newReq = new Request(url.toString(), request)
       newReq.headers.set('Host', new URL(origin).host)
       return fetch(newReq, { cf: { cacheTtl: 0 } })
     }
   }
   ```
   - `Deploy` 保存。得到地址 `https://pikachu-supabase.<你的子域>.workers.dev`
3. **验证反代通不通**（在 Hardison 台式机终端执行）：
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 \
     "https://pikachu-supabase.<子域>.workers.dev/auth/v1/health"
   ```
   - 返回 `200` → 成功；`522/524` → Workers 还没通，等1分钟重试
4. **改项目配置**：编辑 `C:\Users\Windows\projects\ikachu-points\.env.production`（注意实际路径 `pikachu-points`）：
   ```
   VITE_SUPABASE_URL=https://pikachu-supabase.<子域>.workers.dev
   ```
   key（`VITE_SUPABASE_PUBLISHABLE_KEY`）**不用改**。
   - 若 Workers.dev 域名国内也不通，改用自定义域名：Cloudflare 加一个自己的域名 zone，在 Workers 里绑路由 `supabase.你的域名/*`
5. **重建 + 部署**：
   ```bash
   cd C:\Users\Windows\projects\pikachu-points
   npm run build
   git add -A && git commit -m "fix(sync): Supabase 走 Cloudflare Worker 反代绕过阻断"
   # push 用 IPv4 直连方案（见下）
   git -c http.version=HTTP/1.1 -c http.curloptResolve=github.com:443:20.27.177.113 push origin main
   ```
6. **iPad 验证**：清 Safari 网站数据 → 打开儿童端 → 家长端点"推送" → iPad 点"拉取" → 数据出现即修复

---

## 方案B：本机代理（最快验证，但只救一台设备）

### 操作流程
1. 开启代理工具（Clash/v2rayN 等），确认系统代理或 TUN 模式开启
2. 验证：
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 --proxy http://127.0.0.1:7890 \
     "https://bssezchnpxcstfunerhn.supabase.co/auth/v1/health"
   ```
   （端口按你的代理实际改，7890=Clash默认）
3. 返回 `200` 即通。**局限**：iPad 没挂代理时仍不同步 → 长期方案还是 A
4. **不要**在代码里写死代理地址（构建产物跑在浏览器里，浏览器代理≠代码能控制）

---

## 方案C：换国内后端（长期最稳，工作量大）

### 操作流程
1. 选型对比（三选一）：
   | 后端 | 免费额度 | Supabase兼容 | 国内直连 |
   |---|---|---|---|
   | 自建 Supabase（国内VPS） | VPS费 | 100%兼容，改1个URL | ✅ |
   | 阿里云/腾讯 云数据库+REST | 小额度免费 | 需改 `sync.js` | ✅ |
   | 飞书多维表格当后端 | 免费 | 需重写 sync.js | ✅ |
2. 若走自建 Supabase（改动最小）：
   - 买一台国内轻量服务器（腾讯云轻量，CNY 计价）
   - 按 https://supabase.com/docs 自托管（docker compose 一套），或用 `supabase/self-hosted` 镜像
   - 建 6 张表：`checkins` / `exchange_requests` / `projects` / `daily_homework` / `weekly_tasks` / `daily_checkins`（结构字段逐一参照 `src/services/sync.js` push 段的映射；`weekly_plan` 已废弃不用建）
   - ⚠️ `daily_checkins` 建议加 `unique(date, task_id)` 约束：两台设备离线各打同一任务会生成两条不同 id 的记录，upsert 按 id 合并会双记分——有该唯一约束后按 `(date,task_id)` 冲突合并即可去重
   - ⚠️ `checkins` 表要补 `task_id` 列（2026-09-23 push 白名单新增，防双记用）
   - `weekly_tasks` 同步语义（代码已实现）：同 id 云端优先单行覆盖，本地多出的行保留（不删，打卡 taskId 引用它）；**删除不同步、暂无 LWW**，后端落地后若需要再细化
   - 把 `.env.production` 的 URL 换成你的服务器域名，key 换成自建实例的 anon key
   - `npm run build` + push 部署
3. 数据迁移：旧设备各自"推送"一次到新后端（或用 Supabase dashboard 手导 CSV）

---

## ✅ 方案D 落地记录（2026-09-23，本机 PostgREST 垫片 —— 当前生效方案）

**为什么是 D**：A 要注册 Cloudflare 且 workers.dev 国内也可能被墙；C 要花钱实名；D 零账号零费用、GFW 免疫、当天全链路跑通。A/C 门保留备用，D 不排他。

**架构**（`server/sync-server.mjs`，Node≥18 零依赖，端口 8787）：
- PostgREST 兼容子集：`POST /rest/v1/<t>?on_conflict=id`（upsert）+ `GET /rest/v1/<t>`（select *）+ apikey 守卫（`lan-sync-key-2026`）——`sync.js` 只用这两个动词，**同步核心代码零改动**
- 同进程静态托管 `server/dist-lan/`（`npm run build:lan` 产物，`VITE_SUPABASE_URL=SAME_ORIGIN` → 运行时 `location.origin`：访问谁就同步谁，LAN/Tailscale/localhost 换主机名免重建）
- 数据落盘 `server/data/*.json`（原子写、按请求读；该目录已 gitignore）
- **`POST /parse` 作业智能解析（2026-09-23 追加）**：家长端原文+今日课表任务名 → 本机端点调 **mimo-v2.6-flash**（OpenAI 协议 `token-plan-cn.xiaomimimo.com/v1/chat/completions`，key=项目根 `.env` 的 `MIMO_API_KEY` 每请求现读、换 key 免重启，gitignore 挡、无 `VITE_` 前缀不进 bundle）→ 返回 `{tasks:[{name,subject,minutes,note}],engine}`；prompt 要求原子切分/剔寒暄噪音/截止日进 note/对照课表去重；**前端失败自动回退本地正则分段**（`⚠️ 智能解析不可用` + 预览标题不带 ✨），dev 走 vite proxy `/parse→127.0.0.1:8787`，Pages/无服务器环境天然回退
- **撞 id 重分配**：同 id 不同内容 → 分配 `srv-N` 保并集绝不互相覆盖；同内容 → canonical 稳定序列化判等 → 幂等 no-op
- **`daily_checkins` 业务键去重**：同 `(date,task_id)` created_at 新者胜（同时修了老代码撞键 `return` 吞掉批内后续行的 bug）
- 启动：手动 `npm run sync-server` ／ 登录自启 `Startup\pikachu-sync.vbs`（免管理员隐藏窗口；删除该文件即卸载）

**自动推送（E2E 暴露的缺口，本轮补齐）**：
- `db.js`：全部写库函数挂 `markSyncDirty()` → localStorage 脏标 `pikachu-points:sync-dirty`；pull 合并回写期间 `setSyncDirtySuppressed(true)` 抑制（否则 pull 回写误标脏 → 30s 推拉死循环）
- `points.js`：30s 定时器改**先推后拉**（防 weekly_tasks 云端无条件覆盖吞掉未推的本地编辑）+ `visibilitychange(hidden)` / `online` 事件即时冲刷
- `sync.js`：push **全表成功才** `clearSyncDirty()`（部分失败留脏，下轮重试）；pull 三层防双记：① checkins 全字段签名去重（撞id副本不吃）② `(date,taskId)` 业务键（两设备离线同任务不双记）③ weekly_tasks 等值跳过（无变化不回写、不误标脏）

**E2E 实测（2026-09-23）**：
- 写库 → 脏标 → flush（dispatch online 即触发）→ 云端出现 → 脏标清 ✅
- 云端注入同内容异 id 副本（99990）→ 两端本地 tick 后均只留 1 条 ✅
- 新 origin 空库 → 33s tick → checkins=10 / weekly=47 / daily=9 全到位 ✅
- 撞id重分配、幂等、daily_checkins 新者胜+不吞批 → 8788 测试实例全绿 ✅
- 8787 重启激活新代码（sha 前后一致 9394cdbf、6表 rows 全 0、VBS 自启实证）✅

**设备迁移（QC 操作步骤）**：
1. 旧地址打开（`…:5173` 等 dev 地址，`.env.development` 已指向 8787）→ 硬刷新 → 等 30s（或切后台再回）让本地数据自动推上云
2. 新地址打开并加书签/主屏幕：**LAN** `http://192.168.1.251:8787` ／ **Tailscale（跨网）** `http://100.113.38.94:8787` → 30s 内数据到位
3. 安卓学习机装 Tailscale（Google Play 搜 Tailscale，或 https://tailscale.com/downloads 直下 APK 侧载，允许未知来源）→ 登录同一账号 → 用同一新地址
4. 备用：若某设备数据在 `wxc705.github.io` origin → https 页连 http 混合内容被浏览器禁，需回方案A（或该设备重新开始）；目前实测设备都在 dev origin，此条备用

**残留限制（已知未做）**：
- `weekly_tasks` 删除不同步、无 LWW（云优先单行覆盖 + 等值跳过，家庭规模够用）
- 同时离线双设备：daily_checkins 靠云侧 `(date,task_id)` 新者胜兜进度条；checkins 账本靠客户端签名/业务键双兜

## 修复后的统一验收清单（2026-09-23 方案D E2E 实测）
- [x] `curl` 项目 URL `/auth/v1/health` 返回 200（不走代理）→ `http://127.0.0.1:8787/auth/v1/health`=200 ✅
- [x] 写库自动上云：打卡/拨付 → 脏标 → 30s 定时/离页/联网冲刷 → 云端出现 ✅（E2E 探针 3 秒上云）
- [x] 另一台设备打开 → 30s 自动拉取 → 积分/课表出现 ✅（E2E 新 origin 空库 33s 到位）
- [x] 断网恢复 → 脏标留存 + `online` 事件即时冲刷 + 下轮先推后拉 ✅（代码路径 E2E 覆盖）
- [x] 双设备同任务/同内容副本不双记 ✅（E2E 99990 副本两端均只留 1 条）
- [ ] 真 iPad/手机按上方迁移步骤切 URL 后同步正常 —— **待 QC 操作**（E2E 已用等价 URL 形态验证）
- [ ] GitHub Actions 部署完 Pages 线上同步 —— **不适用（方案D）**：Pages 仍指 `.env.production` 被墙 Supabase（方案A备用门）；设备同步一律走 LAN/Tailscale URL

## 备注
- 推荐顺序更新：**D（已落地生效）→ 长期稳可升 C → A 作 Workers 反代备用**；B 仅应急
- 同步代码"逐表隔离错误，失败不连坐"（commit 0ced536）仍在
