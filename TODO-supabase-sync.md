# 待办：皮卡丘积分系统 — 数据同步（Supabase）修复

> 状态：**未解决（阻塞中）** ｜ 优先级：P1 ｜ 创建：2026-09-19 ｜ 负责：Hardison
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
   - 建同样的 4 张表：`weekly_plan` / `projects` / `checkins` / `exchange_requests`（结构参照 `src/services/sync.js` 里的字段）
   - 把 `.env.production` 的 URL 换成你的服务器域名，key 换成自建实例的 anon key
   - `npm run build` + push 部署
3. 数据迁移：旧设备各自"推送"一次到新后端（或用 Supabase dashboard 手导 CSV）

---

## 修复后的统一验收清单
- [ ] `curl` 项目 URL `/auth/v1/health` 返回 200（不需要代理的环境）
- [ ] 家长端添加一个测试积分 → 点"推送" → 显示 ✅
- [ ] iPad 儿童端点"拉取"（或等30秒自动拉取）→ 积分出现
- [ ] 断网再恢复 → 30秒内自动同步，不报错
- [ ] GitHub Actions 部署完，线上 `wxc705.github.io/pikachu-points` 同步也正常

## 备注
- 推荐顺序：**A（Workers反代）→ 不行再 C**；B 仅应急
- 同步代码本身已做过"逐表隔离错误，失败不连坐"（commit 0ced536），单表失败不影响其它表
- 完成后把本文件顶部状态改为 ✅ 已解决，并写清用了哪个方案
