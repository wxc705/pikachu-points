# DSH 审计报告 · 皮卡丘工作台（2026-10-20）

> 审计对象：当前工作树（HEAD `7369e19` + 13 个已修改文件 + 3 个未跟踪文件），不是 HEAD commit。
> 只读声明：未修改 `src/` `scripts/` `server/` `.github/`，未执行 install/build/dev/test，未 commit/push/checkout/stash。本报告是本次唯一写入文件。
> 证据口径：`文件:行号` 均指当前工作树。未运行验证的结论在文中标「未验证」，不把推测写成事实。

## 0. 结论（C. 部分重写）

**结论：C. 部分重写。**

重写**数据与同步层**（`src/services/db.js`、`src/services/sync.js`、`src/services/githubSync.js` 及其行映射/合并语义），并把 `src/stores/points.js`、`src/kid/TodayTasks.vue` 两个巨石按职责拆开；**保留**现有 UI 视觉、课表种子、变身序列、语音/音效、主题和已跑通的业务流程。不是 A（只优化），因为问题不在实现细节，而在「本地自增主键当全局主键 + 只 upsert 不删除」这一数据模型；也不是 B（新建仓重写），因为 5 条业务硬规则大部分只活在注释、魔法数和单点 UI 代码里，全量重写会先把规则重丢一遍。

### 0.1 五条决定性理由

1. **跨设备主键冲突会直接覆盖/丢弃账本行，这是数据模型级错误，不是补丁级 bug。**
   本地所有表都用 IndexedDB `autoIncrement` 主键（`src/services/db.js:29-31`、`:36-38`、`:44-46`、`:59-61`、`:67-69`、`:76-78`），两台设备都从 1 开始生成 id。拉取时 `checkins` 同 id 直接按 `createdAt` 覆盖（`src/services/sync.js:344-365`），`daily_checkins` 同 id 直接跳过云端行（`:463-465`），`exchange_requests` 同 id 覆盖（`:382-393`），`projects` 同 id 覆盖（`:410-423`）。GitHub 引擎的 `mergeById` 同样只按 id 合并（`src/services/githubSync.js:122-131`），没有 LAN 服务器的 `srv-N` 重分配（`server/sync-server.mjs:78-86`）。两台设备离线各打一次卡且都生成 id=1 时，会覆盖/跳过其中一条记录。

2. **删除不会同步，pull 会把删掉的打卡/作业/任务/奖品重新拉回来。**
   `deleteCheckin`、`deleteDailyCheckin`、`deleteWeeklyTask`、`deleteProject` 都只删本地（`src/services/db.js:114-118`、`:292-296`、`:359-369`），push 只做 upsert、没有任何删除路径（`src/services/sync.js:133-248`），pull 只做并集写回（`:324-509`）。因此 `removeTaskToday`（`src/stores/points.js:647-666`）、`removeHomeworkToday`（`:669-688`）、删除奖品（`src/views/Exchange.vue:206-216`）、删除闯关（`src/views/ProjectManage.vue:500-503`）都会被下一轮 pull 复活。

3. **「重置为云端基线」实际不生效，30 秒内会被云端旧数据恢复。**
   `resetToCloudBaseline` 只清本地四表（`src/stores/points.js:863-873` → `src/services/db.js:388-398`），push 对空表直接跳过（`src/services/sync.js:133`、`:155`、`:175`、`:193`、`:216`、`:231` 的 `if (rows.length)`），云端从未被清；随后 30 秒定时 pull（`src/stores/points.js:796-810`）会把旧账本重新拉回。家长端却提示「已重置为云端基线」（`src/views/ParentDashboard.vue:281`）。

4. **双引擎共享契约并不干净，行映射已经四处漂移。**
   同一行字段在 push（`src/services/sync.js:134-247`）、pull（`:325-509`）、灌云脚本（`scripts/seed-cloud.mjs:39-67`）、LAN 服务器（`server/sync-server.mjs:60-90`）各写一遍。已经确认的漂移：`checkins` 的 `homeworkId`/`homeworkIndex` 只存在于本地（`src/stores/points.js:547-548`、`:675`），push/pull 都不映射；`exchange_requests` push 写 `updated_at`（`sync.js:166`），pull 却只按 `createdAt` 判新旧（`:387-390`），审批状态永远同步不过去；`seed-cloud.mjs` 的兑换映射又漏掉 `updated_at`（`:45-48`）。

5. **5 条业务硬规则中 4 条没有可执行测试，且已有 3 条在代码里被局部违反。**
   学校作业不计积分只在 `totalEarned` 过滤（`src/stores/points.js:126-130`），但 `todayEarned` 不过滤（`:141-145`），直接泄漏到家长「今日」净增（`src/views/ParentDashboard.vue:12`）、周报本周新增（`src/views/WeeklyReport.vue:239`）和历史行（`src/views/History.vue:78`）。「只有变身算连胜」的唯一触发点在 `src/kid/TodayTasks.vue:750-756`，另一个儿童主屏 `KidHome` 打卡完全不触发（`src/kid/KidHome.vue:247-269`）。时间线的「长任务覆盖固定锚点」逻辑是 `TodayTasks.vue:549-634` 里的硬编码分钟数，没有测试。全量重写的规则丢失风险见第 3 节。

### 0.2 为什么不是 A（优化），也不是 B（新建仓重写）

**不是 A：** 要修 0.1 的第 1、2 条，必须改主键形态（UUID/ULID 或稳定的客户端 id）、增加删除墓碑、让所有可变行都有 `updatedAt`、让 pull 能识别删除、让 push 能下发删除，并迁移现有 IndexedDB 与云端 `tables/*.json`。这已经是数据层重写，不是「优化」。在现有 `sync.js` 上继续加 `if`，只会让 `SYNC_TABLES`、`PUT_BY_TABLE`、push 六段、pull 六段继续膨胀。

**不是 B：** 现有代码里最贵的东西不是架构，是业务知识：
- 47 条课表种子（`src/services/weeklyTasksSeed.js:25-78`），含周二写字课 18:00-20:00 合并格、阅读顺延等 QC 拍板事实；
- 时间线 86 行（`src/kid/TodayTasks.vue:549-634`），含 `MEAL_TIME`、`fixedKeys`、`coveredByTask` 等没有测试的规则；
- 变身序列与周清零/次日推进（`src/services/ultraSeq.js:27-97`）；
- 奥特曼素材、语音、音效、主题、家长端/儿童端交互（`src/` 共约 8,862 行）；
- t018 的数据抢救通道（`src/services/dataExport.js`）和构建期 token 扫描（`scripts/build-cloud.mjs:36-55`）。

**重建会丢什么：** 全量重写至少要把上述 5 类知识重新实现；其中 4 条硬规则没有测试保护，按当前落点形态估计，重建后丢至少一条的概率高于 70%。同时现有 IndexedDB 账本和 GitHub `tables/*.json` 没有正式迁移格式，重建期最容易发生「旧数据导不进新模型」。这部分是估算，不是实测。

### 0.3 C 的具体边界

**重写：**
- `src/services/db.js` / `sync.js` / `githubSync.js`：统一 schema、UUID/ULID 客户端主键、每行 `updatedAt`、墓碑/删除日志、单一 `ROW_MAP`、纯函数 `merge()`；旧自增 id 保留为 `legacyId` 供迁移。
- `src/stores/points.js`：拆为账本（checkins/requests/总分）、任务（weekly_tasks/daily_homework/daily_checkins）、进度（streak/morph/milestones/achievements）、同步（timer/status）四个 store 或 composable，保留一个对外 facade 防止视图大改。
- `src/kid/TodayTasks.vue`：拆为容器 + `useDailyTimeline`（时间线纯函数）+ 学校面板 + 拓展面板 + 商城/成就/变身弹层；CSS 拆出。

**保留：**
- `src/services/weeklyTasksSeed.js`、`ultraSeq.js`、`themes/`、`sound.js`、`voice.js`（TTS 输出部分）、`knowledge-graph.json` 只读地图、现有视觉样式；
- 家长端/兑换/项目管理/设置的主要交互；
- `dataExport.js` 与 `build-cloud.mjs` 的安全自检思路。

**退役：**
- `WeeklyPlan.vue` + `weekly_plan` 表/方法；`Home.vue`（已被根路由跳走）；`v2-style.css`；`clearAll` 等未用 DB helper；
- `KidHome.vue` 与 `TodayTasks.vue` 二选一（当前二者行为已分叉，见 2.1）。

**Supabase 分支：** 只为 `npm run build:lan` 的 LAN PostgREST 垫片保留，作为独立 `sync-supabase` 适配器；云端 Pages 构建不再走 Supabase，旧 Supabase 项目与 anon key 必须下线/轮换（见 P0-5）。GitHub 引擎继续保留。

**成本对比（估算，非实测）：** C 的数据层重写 + 迁移约 60-90h，拆 `points.js`/`TodayTasks.vue` 约 40-60h，补规则单测约 20-30h，PWA 6-10h，合计约 **130-190h**；B 全量重写约 **250-350h**，另加现有 IndexedDB/云端数据迁移与 5 条规则重新验收；A 只修当前 P0 约 50-70h，但 P0-1/P0-2 的主键与删除模型不动，半年内会以同样形式复发。C 的收益是保住家庭规则和 UI，成本集中在最难测试的数据层。

## 1. 六维评分表

> 方向说明：第 1、3、4、5、6 项为「越高越好」；第 2 项「数据一致性风险」是反向分，**越高越危险**。总分不做平均，避免把数据风险平均掉。

| 维度 | 得分 | 方向 | 一句证据 |
|---|---:|---|---|
| 架构清晰度 | 4/10 | 越高越好 | `sync.js` 有单一 facade（`src/services/sync.js:111-541`），但存在两个儿童端 UI（`router.js:38` 的 `KidHome` 与 `:40` 的 `TodayTasks`）、废弃 `weekly_plan` 路由（`router.js:34`）和六处硬编码表清单（`sync.js:50`）。 |
| 数据一致性风险 | **9/10** | **越高越危险** | 自增 id 跨设备冲突（`db.js:29-31` + `sync.js:344-365`）、删除复活（`sync.js:133-248` + `db.js:359-369`）、审批状态不同步（`sync.js:387-390`）、重置被 pull 恢复（`points.js:796-810`、`:863-873`）。 |
| 可维护性 | 3/10 | 越高越好 | `TodayTasks.vue` 1,421 行、`points.js` 967 行；同一行字段在四处映射（`sync.js:134-247`、`:325-509`、`seed-cloud.mjs:39-67`、`sync-server.mjs:60-90`）；`src/` 约 8,862 行、无类型/无 lint 脚本。 |
| 可测试性 | 2/10 | 越高越好 | `package.json` scripts 无 `test`；全仓无 `*.test.*`/`*.spec.*`/`vitest.config`/`playwright.config`；只有 `scripts/e2e-*.py`，且 `e2e-homework-subject.py` 断言的 `.subj-tag` 在当前源码不存在（`TodayTasks.vue:117-119`）。 |
| 安全（token 与密钥） | 5/10 | 越高越好 | 好的一面：GH token 运行时读 `localStorage`、不进 bundle（`githubSync.js:18-28`），`build-cloud.mjs:36-55` 做密钥扫描。坏的一面：公开仓跟踪 `.env.production:1-2`，旧 Supabase RLS 允许 anon 全表读写（`supabase-daily-homework.sql:14-21`），而 `deploy.yml:24` 仍用普通 `npm run build`；前端无 CSP（`index.html:1-17`）。 |
| 前端性能与包体 | 4/10 | 越高越好 | PWA/SW 被注释掉（`vite.config.js:3-5`、`:10-36`），断网冷启动不可用；路由全部静态 import（`router.js:2-13`）；`public/ultraman/seq/04/morph.gif` 单文件 3,775,214 B；30 秒轮询拉 6 张全表（`points.js:796-810`、`sync.js:287-294`）。 |

## 2. 债务清单（P0/P1/P2，带证据）

### 2.1 指定嫌疑点逐项核查

| 嫌疑点 | 结论 | 证据与说明 |
|---|---|---|
| `WeeklyPlan.vue` 退场残留 | **确认存在（死功能）** | 路由还在（`src/router.js:34`），但 App 导航（`src/App.vue:55-63`）、家长快捷入口（`ParentDashboard.vue:228-232`）都没有 `/weekly-plan`；页面自称「孩子在打卡页会看到今日推荐」（`WeeklyPlan.vue:5`），实际 `todayRecommended` 除定义/导出（`points.js:359-365`、`:899`）外无消费方。 |
| `weekly_plan` 相关 store 方法 | **确认存在（仅被死页面使用）** | DB 建表（`db.js:51-56`）、读写方法（`db.js:230-250`）、store 导入/状态/方法（`points.js:14-16`、`:96`、`:189`、`:197`、`:367-377`）仍在；唯一消费方是 `WeeklyPlan.vue:122-167`。`weekly_plan` 不在 `SYNC_TABLES`（`sync.js:50`），所以从不同步。 |
| `src/services/supabase.js` | **确认存在；不能简单删，但云端路径应隔离** | `sync.js:8`、`githubSync.js:10` 仍无条件 import；`syncEngineClient()` 非 github 时返回 Supabase（`githubSync.js:40-43`），`build:lan` 依赖它（`scripts/build-lan.mjs:3-8`、`supabase.js:11-21`）。它已不是云端主路径，但仍是 LAN 路径的运行时前提。 |
| `scripts/seed-cloud.mjs` | **确认存在（未跟踪的一次性灌云工具，且已漂移）** | `git status` 显示未跟踪；映射与 push 不一致：兑换漏 `updated_at`（`seed-cloud.mjs:45-48` vs `sync.js:166`），`checkins.created_at` 被转 ISO（`:43` vs `sync.js:144`），`daily_checkins` 没有 `created_at`（`:62-66`）而 LAN 服务器去重读 `created_at`（`sync-server.mjs:70`）。 |
| `server/dist-lan/` 是否误提交 | **排除** | `.gitignore:30-31` 忽略 `server/dist-lan/`；`git ls-files server` 只有 `server/sync-server.mjs`；`git ls-files dist` 为 0。它是构建产物，不是源码，已按要求排除阅读。 |
| `History.vue` / `WeeklyReport.vue` 是否还有消费方 | **排除死亡；确认仍有消费方** | `History` 路由 `router.js:28`、家长快捷入口 `ParentDashboard.vue:231`、旧首页 `Home.vue:83`；`WeeklyReport` 路由 `router.js:30`、App 顶栏 `App.vue:59`。二者都活着，但分数口径违反硬规则 1（见 P0-4）。 |
| 巨石文件 `TodayTasks.vue`（1,421 行） | **确认存在，应拆** | 模板到 469 行、脚本到 1,097 行、样式到 1,421 行；同时承担学校/拓展打卡、时间线、商城、成就、变身、临时补录/删除、语音。拆分方案与风险见 P1-4。 |
| 巨石文件 `points.js`（967 行） | **确认存在，应拆** | 账本（`checkins/requests/total*`）、课表 CRUD（`382-449`）、作业（`507-688`）、成就（`692-736`）、主题（`742-760`）、同步定时器（`786-828`）、里程碑（`875-891`）全在一个 setup store。 |
| 双引擎耦合 | **确认不干净** | `sync.js` 直接 import 两个引擎（`:8-9`），在模块加载时选一个（`:13`）；GitHub 适配器只实现 `upsert/select`（`githubSync.js:171-179`），但两边对「同 id 不同内容」的行为不同（GitHub 覆盖 vs LAN `srv-N` 重分配，`githubSync.js:122-131` vs `sync-server.mjs:78-86`）。 |
| 同步字段白名单漂移 | **确认存在（多处）** | ① `checkins` 的 `homeworkId/homeworkIndex` 本地有（`points.js:547-548`），push/pull 都没有（`sync.js:134-147`、`:325-336`）；② 兑换 push 有 `updated_at`（`:166`），pull 不读也不用于 LWW（`:371-390`）；③ `saveTodayHomework` 只保留 name/points/done（`points.js:561-565`），丢掉家长解析出的 `subject/minutes/note`（`ParentDashboard.vue:355`）；④ `seed-cloud` 与 `sync-server` 的 `created_at` 契约不一致（见上）。 |
| localStorage 分散键 | **确认存在，无统一命名/迁移** | 5 个键：`pikachu-points:sync-dirty`（`db.js:6`）、`pikachu-points:reached-milestones`（`points.js:43`）、`pikachu-points:theme-id`（`points.js:44`，`main.js:26` 又写死一遍）、`pikachu-points:ultra-char`（`ultraSeq.js:20`，`points.js:866` 又写死一遍）、`pk_gh_token`（`githubSync.js:13`）。无版本号、无迁移函数；`dataExport.js:13` 只导出 `pikachu-points:` 前缀（token 被排除是好事，但新前缀会漏备份）。 |
| 测试覆盖（`scripts/e2e-*.py` 之外） | **确认没有** | `package.json` 无 `test` script；全仓无单元测试文件/配置。合并逻辑的兜底只有 `scripts/e2e-github-sync.py`（mock GitHub，`push/pull/空云/409`，`:269-348`）和未跟踪的 `e2e-homework-subject.py`；后者断言的 `.subj-tag`（`:94-97`）在 `TodayTasks.vue:117-119` 当前不存在，且 `saveTodayHomework` 会丢 `subject`，该脚本按现状会失败。 |

### 2.2 P0（立即修）

**P0-1 跨设备自增 id 冲突导致覆盖/丢行**
- 证据：`db.js:29-31`、`:36-38`、`:44-46`、`:59-61`、`:67-69`、`:76-78`（autoIncrement）；`sync.js:344-365`（checkins 同 id 按 createdAt 覆盖）、`:463-465`（daily_checkins 同 id 跳过云端）、`:382-393`（requests）、`:410-423`（projects）；`githubSync.js:122-131`（只按 id 合并）。
- 现象：两台设备各自从 1 开始自增；同一天同一张表出现同 id 不同内容时，一台设备的行被覆盖或被跳过；`guardNoShrink` 只数行数，查不出来。
- 修法：客户端生成 UUID/ULID 作为 `uid`，`id` 降级为 legacy；或者 GitHub 适配器实现 LAN 服务器同款 `srv-N` 重分配 + 业务键去重。推荐前者，并做 IndexedDB v5 迁移与云端 `tables/*.json` 一次性迁移。
- 工作量：**16-24h**（含迁移脚本与回滚）。

**P0-2 删除/重置被 pull 复活**
- 证据：`db.js:114-118`、`:292-296`、`:359-369` 只删本地；`sync.js:133-248` 只 upsert；`sync.js:324-509` 只 put；`points.js:647-688` 的删除、`Exchange.vue:206-216` 的删奖品、`ProjectManage.vue:500-503` 的删闯关都走这条链；`resetToCloudBaseline`（`points.js:863-873`）清本地后 30 秒 pull（`:796-810`）恢复。
- 现象：孩子点「临时删除」、家长删奖品/闯关、家长清零账本，都会在下一轮同步后回来；`resetWeeklyTasks` 还会把云端旧任务重新拉回，造成重复课表。
- 修法：加 `deletedAt` 墓碑（或独立 tombstones 表）+ outbox；pull 先合并墓碑再写；push 下发墓碑；提供显式的 `clearCloud`/`replace` 操作，而不是让空表 push 静默跳过。
- 工作量：**16-24h**。

**P0-3 兑换审批状态不同步**
- 证据：push 写 `updated_at`（`sync.js:166`），pull 只映射 `createdAt`（`:379-380`）并按 `createdAt` 判新旧（`:387-390`）；`updateRequest` 只改 `status/viewed/decidedAt`（`points.js:299-305`），不改 `createdAt`。
- 现象：家长在手机上点「通过」，iPad 已有同 id 申请时，pull 因 `createdAt` 相等而跳过，孩子端一直显示「待审核」；`viewed` 同样不同步。
- 修法：所有可变行加本地 `updatedAt`，`updateRequest` 写 `updatedAt: Date.now()`；pull 对 requests 用 `updatedAt/decidedAt` 做 LWW；同时把 `updated_at` 纳入 pull 映射。
- 工作量：**3-4h**。

**P0-4 学校作业积分泄漏到「今日」/周报/历史**
- 证据：`totalEarned` 过滤 `category !== '学校'`（`points.js:126-130`），但 `todayEarned` 不过滤（`:141-145`），`todayNet = todayEarned - todaySpent`（`:153`）；`ParentDashboard.vue:12` 显示 `todayNet`；`WeeklyReport.vue:239`/`:244`/`:261`/`:284` 全部对 `weekCheckins` 求和；`History.vue:78` 把学校行显示为 `+pointsEarned`，而顶部 `totalEarned`（`:9`）又排除学校。学校 checkin 确实写入 `pointsEarned: task.points`（`points.js:542-553`）。
- 现象：余额 `totalPoints` 正确，但「今日净增」「本周新增」「历史行」会把学校作业算成积分，违反硬规则 ①；历史行求和与总获得对不上。
- 修法：抽 `isPointEarning(checkin)`（`category !== '学校'`）单一常量/函数，`totalEarned`、`todayEarned`、`WeekReport`、`History` 全部复用；学校进度单独用完成数展示。
- 工作量：**3h**（含回归检查）。

**P0-5 发布管线会部署成 Supabase 口味，且旧库 anon 全权限**
- 证据：`.github/workflows/deploy.yml:23-24` 是 `npm ci` + `npm run build`，没有 `VITE_SYNC_ENGINE=github`、没有 `VITE_GH_REPO`；普通 build 会读被跟踪的 `.env.production:1-2`（真实 Supabase URL + publishable key）；`sync.js:13` 只有 `VITE_SYNC_ENGINE === 'github'` 才走 GitHub，否则 `syncEngineClient()` 返回 Supabase（`githubSync.js:40-43`）；Settings 的密钥区块也只在 `SYNC_ENGINE === 'github'` 时渲染（`Settings.vue:135`）。
- 安全面：`supabase-daily-homework.sql:14-21` 明确 `FOR ALL USING (true) WITH CHECK (true)`；README 的其余表策略同样是 anon 全放开。只要旧 Supabase 项目仍在线，公开仓里的 URL+key 就能读写全家数据。
- 现象：与「线上当前跑 GitHub 引擎」的事实冲突。若 GitHub Actions 生效，下一次 push main 会把线上覆盖成 Supabase 口味，且页面没有录入 GH token 的入口；若线上是手工 `build:cloud` 部署，下一次 Actions 也会覆盖它。实际 Pages 部署来源未验证（见第 5 节）。
- 修法：workflow 改为 `npm run build:cloud` 并注入 `VITE_GH_REPO`；`.env.production` 清空/移出 Supabase；删除或彻底下线旧 Supabase 项目并轮换 key；给 Actions 加产物断言（`api.github.com` 存在、`supabase|sb_publishable` 为 0）。
- 工作量：**4h**（不含旧库数据处置与 key 轮换）。

### 2.3 P1（本季度）

**P1-1 `weekly_tasks` 删除不同步、无 LWW，云端可覆盖本地编辑**
- 证据：`sync.js:427-455` 对同 id 云端优先覆盖，`wtEq` 只做等值跳过，没有 `updatedAt`；`TODO-supabase-sync.md:98` 自己承认「删除不同步、暂无 LWW」。
- 现象：家长改课表后若 push 失败/先 pull，旧云端覆盖新编辑；删任务会被 pull 拉回；`resetWeeklyTasks`（`points.js:396-404`）先删后建，云端旧行会重新拉回造成重复。
- 修法：`weekly_tasks` 加 `updatedAt` 与墓碑；pull 用 LWW；删除走墓碑。
- 工作量：**8h**。

**P1-2 行映射白名单漂移（含学校作业回滚与 subject 丢失）**
- 证据：`sync.js:134-147`/`:325-336` 不含 `homeworkId/homeworkIndex`，`points.js:547-548`/`:675` 依赖它们；`points.js:561-565` 只映射 `name/points/done`，`ParentDashboard.vue:355` 解析出的 `subject/minutes/note` 被丢掉；`seed-cloud.mjs:45-48` 漏 `updated_at`；`sync-server.mjs:70` 读 `created_at` 但 `sync.js:232-241` 不写 `created_at`。
- 现象：学校作业打卡同步到另一台设备后，无法按 `homeworkId/homeworkIndex` 回滚；家长端作业的科目/时长/备注不落库（未跟踪的 `e2e-homework-subject.py:147-153` 正好断言这三项）。
- 修法：每表一份 `ROW_MAP`（本地 ↔ 云端）供 push/pull/seed-cloud 共用；把 `homeworkId/homeworkIndex`、`subject/minutes/note` 纳入契约；补 `daily_checkins.created_at` 或改 LAN 去重使用 `completed_at`。加字段漂移单测。
- 工作量：**8h**。

**P1-3 `guardNoShrink` 是空闸，保护不了真实故障**
- 证据：`sync.js:87-105` 只比较 pull 前后行数；pull 全程只 `put` 不 `delete`（`:324-509`），正常路径行数不可能减少；覆盖、id 冲突、删除复活都不会让行数变少。
- 现象：代码注释宣称的「三道闸」第 ③ 道实际不可达；它给出「有回滚保护」的错觉。
- 修法：改为内容级校验（pull 前快照的 id/签名集合，pull 后不得丢失本地独有 id），或至少校验 `before` 行仍在 `after` 中；配合 P0-1/P0-2 的墓碑。
- 工作量：**4h**。

**P1-4 两个儿童端 UI 行为分叉，且家长入口是坏的**
- 证据：`router.js:38` 有 `/kid`（KidHome），`:40` 有 `/kid/today`（TodayTasks），根路由 `/` 永远跳 `/kid/today`（`:22-26`）；全仓没有 `router.push('/kid')` 或 `to="/kid"` 的入口，`KidHome` 实际只能手输 URL；`KidHome` 只读 `store.todayTasks`（`:200`），不显示学校作业，也不调用 `markMorphDay`（`:247-269`），而连胜唯一触发在 `TodayTasks.vue:750-756`；TodayTasks 的「家长端」链接是 `href="#/"`（`:33`、`:379`），会被根路由跳回 `/kid/today`，且儿童端 CSS 隐藏了顶部导航（`kid-style.css:8-10`）。
- 现象：`/kid` 主屏打卡不涨连胜、不显示学校作业；家长从儿童端点「家长端」回不到 `#/parent`；t019 新增的主屏没有可达入口。
- 修法：二选一。要么删 `KidHome`，只保留 TodayTasks；要么把 KidHome 设为真正主屏，补学校作业/变身触发/入口，并把「家长端」链接改 `#/parent`。同时删除无用 `isIPad`（`router.js:15-19`）。
- 工作量：**4-6h**。

**P1-5 无 PWA/SW，断网冷启动不可用**
- 证据：`vite.config.js:3-5` 注释「PWA 暂时禁用」，`VitePWA` 整段注释（`:10-36`）；`public/` 只有图标，没有 `manifest.webmanifest`/service worker；`index.html` 没有 manifest 链接。README 却写「PWA 离线可用」（`README.md:4`），DESIGN 也标 ✅（`DESIGN.md:667`）。
- 现象：页面已加载时打卡走 IndexedDB 可用；iPad 从主屏幕冷启动、断网时没有 SW 缓存 app shell，直接打不开。对「iPad 断网可用」的设计目标不成立。
- 修法：恢复 `vite-plugin-pwa`，缓存 `index.html`/assets/知识图谱，排除 `api.github.com`；更新策略用 `autoUpdate`；在 iPad 上做一次飞行模式验收。
- 工作量：**6-10h**。

**P1-6 合并逻辑没有单元测试兜底，现有 E2E 已出现「测不存在的功能」**
- 证据：`package.json` 无 `test`；无 `*.test.*`；`e2e-github-sync.py` 只覆盖 push/pull/空云/409（`:269-348`），没有 id 冲突、删除、审批状态、重置；`:245` 的「GitHub 引擎已注入」只断言 `typeof fetch === 'function'`，是空断言；`e2e-homework-subject.py` 断言的 `.subj-tag` 在 `TodayTasks.vue:117-119` 不存在，`saveTodayHomework` 又丢 subject（`points.js:561-565`）。
- 现象：改 merge 逻辑只能靠手工浏览器 E2E；CI 只跑 build，不跑测试。
- 修法：把 `mergeById`/`unionRows`/`guardNoShrink`/墓碑/审批 LWW 抽成纯函数，Vitest 覆盖 id 冲突、空云、删除、状态变更、字段往返；`npm test` + CI；删除或修好 `e2e-homework-subject.py`。
- 工作量：**16-24h**。

**P1-7 手动「拉取」在有合并但无新增时不刷新 UI**
- 证据：`points.js:841-845` 只在 `r.pulled > 0` 时 `refresh()`，`merged` 不触发；`ParentDashboard.vue:258-260` 也只在 `pulled > 0` 时提示成功。
- 现象：云端更新了已有行（如家长改名、审批），手动拉取后提示「云端无新数据」，页面仍是旧值，直到下一次自动 pull 或重新进入。
- 修法：`if (r.pulled > 0 || r.merged > 0) await refresh()`；提示区分「新增/更新」。
- 工作量：**1h**。

**P1-8 token 安全边界不足（CSP、旧 Supabase、LAN parse）**
- 证据：GH token 在 `localStorage` 明文（`githubSync.js:21-24`），`index.html:1-17` 无 CSP；`ParentDashboard.vue:346` 请求 `/parse`，`server/sync-server.mjs:163-178` 在鉴权（`:240`）之前开放 `/parse`，`SYNC_HOST` 默认 `0.0.0.0`（`:25`），默认 key `lan-sync-key-2026`（`:26`），CORS `*`（`:102`）。
- 现象：任何 XSS/第三方脚本可读 GH token；局域网/Tailscale 内任何人可无 key 调用 LLM 解析，消耗 `.env` 里的 `MIMO_API_KEY`。
- 修法：加 CSP；GH token 用 fine-grained、仅目标数据仓 contents 读写；`/parse` 加鉴权/限流；LAN 不暴露到公网。
- 工作量：**4-6h**。

### 2.4 P2（有空再说）

- **P2-1 `WeeklyPlan`/`weekly_plan` 死功能**：`router.js:34`、`WeeklyPlan.vue:5`、`db.js:51-56`/`:230-250`、`points.js:14-16`/`:367-377`；删路由/视图/表/方法，DB 升版时移除 store。**2h**。
- **P2-2 `Home.vue`、`v2-style.css`、未用导出**：`Home.vue` 被根路由跳走（`router.js:2`、`:22-26`）；`v2-style.css` 全文件未被 import（grep 仅文件自身），15,220 B；`clearAll`（`db.js:200-208`）、`getWeeklyPlan`（`:235-238`）、`getCheckinsByDate`（`:138-141`）、`getDailyHomeworkByDate`（`:330-333`）、`deleteDailyHomework`（`:371-375`）、`weeklyTaskCounts`（`weeklyTasksSeed.js:81-88`）、`todayCheckedProjectIds`/`todayProjectCounts`/`todayRecommended`/`todayHomeworkEarned`（`points.js:107-123`、`:359-365`、`:527-531`）无消费方。清理前先确认没有动态引用。**3h**。
- **P2-3 localStorage 统一命名/迁移**：5 个键（见 2.1），`main.js:26` 与 `points.js:44` 重复字面量，`points.js:866` 与 `ultraSeq.js:20` 重复字面量；抽 `src/services/storage.js`（keys/version/migrate），加迁移。**4h**。
- **P2-4 内存态 checkin 丢 id**：`points.js:225`、`:241`、`:258`、`:276` 调用 `dbAddCheckin` 后没有把返回 id 写回 `entry`；`History.vue:73` 用 `c-${c.id}` 作 key，会得到多个 `c-undefined`；`addTaskCheckin`/`addHomeworkCheckin` 已正确写回（`:489`、`:501`、`:553`）。修法：和 addRequest（`:293-294`）一样写回 id。**2h**。
- **P2-5 全勤弹层误判/跨日不重置**：`TodayTasks.vue:903-916` 用 `hwAllDone || expAllDone`，任一栏完成就弹「全勤」，并置 `_allDoneFired`（`:909`）；`_allDoneFired` 没有随 `store.today` 变化重置，第二天不会再弹。修法：改为 `&&`，并在 `watch(store.today)` 重置。**2h**。
- **P2-6 时间条「今天任务都完成」误报**：`TodayTasks.vue:782-792` 在没有下一个 slot 时显示「今天的任务都完成啦」，不检查 `dailyDone === dailyTotal`。**1h**。
- **P2-7 生产环境调试入口**：`TodayTasks.vue:70` 进度条点击 `debugTriggerMorph`，`title` 明写「调试入口」；6 岁孩子可点出变身但不记连胜。删掉或加隐藏开关。**0.5h**。
- **P2-8 30 秒全表轮询 + 每表一次 commit**：`points.js:796-810` 每 30s `syncPull()`；`sync.js:287-294` 固定 6 个 `select`；`githubSync.js:151` 每表一次 PUT/commit。GitHub 上长时间开机会产生大量请求和提交；改为 ETag/条件请求、仅 visibility/online/定时 5min，或合并提交。**8h**。
- **P2-9 大素材与首屏**：`public/ultraman/seq/04/morph.gif` 3,775,214 B、`03/morph.gif` 1,873,273 B；`morph.gif` 只在变身时加载，但 GitHub Pages + iPad 网络下仍是明显卡顿风险；压缩/换 WebP/视频或预加载策略。路由全部静态 import（`router.js:2-13`），可对报告/设置/地图做动态 import。**4h**。
- **P2-10 首启 seed 竞态**：`main.js:17` 不 await `seedIfEmpty()`，`:19` 立即 mount；`seed.js:39-45` 循环 `addProject`；组件 `onMounted` 的 `store.load()` 可能与 seed 并发，读到部分 projects，之后没有 refresh。未运行复现，代码路径存在。修法：启动前 await，或让 store 等待同一个 seed promise。**2h**。
- **P2-11 未跟踪关键文件**：`src/services/dataExport.js` 被 `main.js:9` 静态 import，但 `git status` 显示未跟踪；若只提交 `main.js` 不提交它，构建直接失败。`scripts/seed-cloud.mjs`、`scripts/e2e-homework-subject.py` 也未跟踪。**0.5h**。
- **P2-12 文档与实现不一致**：README 仍写 Supabase/PWA（`README.md:4`、`:19`、`:180`），DESIGN 把 PWA 标 ✅（`DESIGN.md:667`），与 GitHub 引擎 + PWA 禁用不符；`TODO-supabase-sync.md:98`/`:137-138` 已记录 weekly 删除/LWW 限制但代码未修。统一文档或加「已废弃」标记。**2h**。
- **P2-13 `History` 无分页**：`History.vue:69-110` 一次性合并所有 checkins/requests 并按天分组；数据量增长后渲染变慢。加分页/虚拟列表。**3h**。

## 3. 业务硬规则落点核查

> 结论先行：5 条里只有规则 ③ 有 E2E 覆盖；① 在代码里被局部违反；② 的唯一触发点在一个 UI；④ 是纯魔法数；⑤ 是一个 computed 过滤。**没有一条被写成可复用常量 + 单测。** 这是选 C 而不是 B 的核心理由。

### 规则 ① 学校作业不计积分，只给变身进度

- 落点：
  - 积分过滤：`src/stores/points.js:125-130`（`totalEarned` 过滤 `category !== '学校'`）。
  - 学校 checkin 写入：`src/stores/points.js:542-553`（`category: '学校'`，`pointsEarned: task.points`）。
  - 变身进度用完成数：`src/kid/TodayTasks.vue:740-748`（`dailyDone/dailyTotal` 只看 done，不看 points）。
  - UI 文案：`TodayTasks.vue:119`、`:268` 把学校显示为「变身进度」。
- 违反点：
  - `todayEarned` 不过滤学校：`points.js:141-145`；`todayNet` 由此计算（`:153`），家长端显示（`ParentDashboard.vue:12`）。
  - 周报：`WeeklyReport.vue:239`、`:244`、`:261`、`:284` 对全部 checkins 求和。
  - 历史：`History.vue:78` 把学校行显示成 `+pointsEarned`，而顶部 `totalEarned`（`:9`）排除学校。
- 可测试性：**无**。没有 `isPointEarning` 常量，没有单测；只有两处注释和一处过滤。
- 重建丢失概率：**高，估计 70%**。依据：规则已经泄漏到 4 个消费方，说明它不是被单一模型强制的；重建若按「checkin 就是积分」重画，最容易把学校算进去。

### 规则 ② 只有「奥特曼变身」才算连胜

- 落点：
  - 变身日真源：`src/services/ultraSeq.js:72-90`（`markMorphToday`）、`:92-97`（`getMorphDays`）。
  - 连胜计算：`src/stores/points.js:157-174`（`currentStreak` 只读 `morphDays`）。
  - 唯一触发：`src/kid/TodayTasks.vue:750-756`（`watch([dailyDone,dailyTotal])` → `store.markMorphDay()`）。
  - 等级展示：`KidHome.vue:283-295`、`TodayTasks.vue:714-738`。
- 违反点：
  - `KidHome.vue:247-269` 的打卡只调 `store.addTaskCheckin`，没有 `markMorphDay`，也没有 `dailyProgress` watch；在 `/kid` 完成全部任务不会变身/涨连胜。
  - `TodayTasks.vue:70` 的调试入口可显示变身但不写 `morphDays`。
- 可测试性：**无**。`markMorphToday` 的周一清零、次日推进、60 天截断（`ultraSeq.js:41-62`、`:84-87`）没有测试。
- 重建丢失概率：**高，估计 75%**。依据：触发点绑在一个 UI 组件的 watch；另一个 UI 已经漏了。

### 规则 ③ pull 只做并集合并；空云端/读取失败绝不清本地（行数回滚闸）

- 落点：
  - 注释与三道闸：`src/services/sync.js:46-50`、`:78-84`（空/失败跳过）、`:87-105`（行数闸）。
  - pull 写回：`src/services/sync.js:324-509`（只 `put`，无 `delete`）。
  - GitHub 读空保护：`src/services/githubSync.js:143-147`（有 sha 但 raw 为空 → 拒绝覆盖）。
  - E2E：`scripts/e2e-github-sync.py:323-348`（空云 pull 行数不减少）。
- 评价：
  - 空云端「不清本地」这条**确实成立**（`unionRows` + GitHub 读空保护）。
  - 但「行数回滚闸」在正常路径**不可达**：pull 只 put，行数不会减少；它查不出覆盖、id 冲突、删除复活。
  - 规则文本说「并集合并」，但 id 冲突时 `checkins/requests/projects` 会覆盖同 id 行（`sync.js:344-365`、`:382-393`、`:410-423`），`daily_checkins` 会跳过（`:464`）。并集只在表级，不在业务行级。
- 可测试性：**有 E2E（空云）**，但无单测；没有 id 冲突/删除/覆盖测试。
- 重建丢失概率：**中，估计 40%**。依据：有注释 + E2E 空云场景，但「行数闸」本身是假保护；重建若用常规 LWW 很容易把空云保护丢掉。

### 规则 ④ 今日时间线按当天数据动态生成，固定锚点可被长时段任务覆盖而剔除

- 落点：`src/kid/TodayTasks.vue:549-634`。
  - 固定锚点：`:551` `MEAL_TIME`、`:594-596` 起床/上学/放学、`:601` `fixedKeys`、`:611-620` 到家/作业/自由/洗漱/睡觉。
  - 长任务跨度：`:584-586` `taskSpans`、`:587-588` `coveredByTask`、`:604-605` 覆盖判断。
- 可测试性：**无**。全部是组件内 computed，依赖 `nowMinutes`、`store.todayTasks`、`new Date()`；没有导出的纯函数，没有测试。
- 重建丢失概率：**最高，估计 85%**。依据：规则不在数据/常量层，而在 86 行 UI 代码里；`18:00-20:00` 写字课覆盖 `18:30/19:30` 锚点是特定家庭课表事实（`weeklyTasksSeed.js:17` 有注释），重画 UI 时最容易丢。

### 规则 ⑤ 只显示当天任务，绝不能倒全周

- 落点：
  - `src/stores/points.js:451-457` `todayTasks`：按 `dateToWeekday()` 过滤、`isActive`、`once`、`skips`。
  - 消费：`TodayTasks.vue:572`/`:741`、`KidHome.vue:200`、`TodayTasks.vue:163`。
  - 根路由默认进今日：`router.js:22-26`。
  - 历史 bug 注释：`router.js:35-37`。
- 可测试性：**无直接单测**；`e2e-github-sync.py` 不断言任务数量；`e2e-kg-map.py` 只测地图。
- 重建丢失概率：**中高，估计 55%**。依据：过滤本身只有一行，但 `todayTasks` 同时承担 `once/skips` 语义；`KidHome` 已复制了一套 `goals` 读取，重建时容易把「全周」重新倒出来。

### 规则 -> 落点 -> 测试 -> 丢失概率 汇总

| 硬规则 | 主要落点 | 可执行测试 | 现状 | 全量重建丢失概率（估计） |
|---|---|---|---|---|
| ① 学校不计积分、只给进度 | `points.js:126-130`、`TodayTasks.vue:740-748` | 无 | **局部违反**：`todayEarned`/周报/历史把学校算积分 | 70% |
| ② 只有变身算连胜 | `ultraSeq.js:72-97`、`points.js:157-174`、`TodayTasks.vue:750-756` | 无 | **局部违反**：`KidHome` 打卡不触发 | 75% |
| ③ pull 并集、空云不清本地、行数闸 | `sync.js:46-105`、`:324-509`、`githubSync.js:143-147` | E2E 空云（`e2e-github-sync.py:323-348`） | 空云保护成立；行数闸不可达；id 冲突会覆盖 | 40% |
| ④ 动态时间线 + 长任务覆盖锚点 | `TodayTasks.vue:549-634` | 无 | 魔法数 + 组件内 computed | 85% |
| ⑤ 只显示当天 | `points.js:451-457`、`router.js:22-26` | 无直接单测 | 当前成立；`KidHome` 复制了读取路径 | 55% |

**重建结论：** 5 条规则里 4 条没有单元测试，3 条已经在现有代码里被局部违反；全量重建不是「重写得更干净」，而是「把没有测试的家庭规则重新猜一遍」。因此选 C，保留代码事实，先把规则抽成常量和测试，再改数据层。

## 4. 半年压力测试

> 假设未来 6 个月连续加：① 养猫游戏联动；② 知识图谱完整版（含录入界面）；③ 每日复盘语音链路。以下按「在现架构上加」推演，不假设先做第 0 节的 C。

### 4.1 先崩点排序

1. **`src/services/sync.js:50` 的六表硬编码 + 自增 id 语义**——最先崩。
2. **`src/kid/TodayTasks.vue`（1,421 行）与 `src/stores/points.js`（967 行）**——第二个崩点。
3. **`src/views/ParentDashboard.vue:346` 的 `/parse` 只存在于 LAN/dev**——语音链路会卡在后端。

### 4.2 养猫游戏联动

- **第一崩点：同步表清单。** 加猫的状态（饥饿/心情/等级/互动记录）至少需要一张新表；当前 `SYNC_TABLES` 固定 6 张（`sync.js:50`），`PUT_BY_TABLE` 固定 6 个（`:62-69`），push 是 6 段手写（`:133-248`），pull 是 6 段手写（`:287-509`），`db.js` 还要升 `DB_VERSION=4`（`db.js:4`）并加 store。任何一处漏加，猫的状态就只在本机：iPad 喂了猫、家长手机看不到；或者 pull 时被 `unionRows` 跳过。
- **第二崩点：`points.js` 的经济系统。** 猫粮若用积分兑换，会和 `totalPoints`（`points.js:136`）、兑换审批（`totalSpent` `:132-134`）耦合；当前审批没有事务/预留，两个 pending 申请可同时被批准导致负余额（`ParentDashboard.vue:85-86` 逐个 decide；`totalSpent` 只统计已批准）。猫游戏再开一个消耗口，负余额/双花会更明显。
- **第三崩点：UI 扩展。** `TodayTasks.vue` 的 tab 只有 today/points/apply/settings（`:81-381`），宽屏侧栏（`:12-31`）和底部 tab（`:386-392`）各写一套；加猫 tab 要改两处 + 模板 + 样式。1,421 行文件里再塞宠物循环/动画，回归面很大。
- **崩法：** 首先表现为「猫只在 iPad 有、手机没有」或「猫粮扣了积分但兑换余额没扣」，而不是页面打不开。

### 4.3 知识图谱完整版（含录入界面）

- **第一崩点：当前地图是只读静态文件。** `KnowledgeMap.vue:129-145` 直接 `fetch(base + 'knowledge-graph.json')`，`public/knowledge-graph.json` 顶部 `"readOnly": true`；没有 IndexedDB 表、没有 store、没有写入 API。要做录入，必须新增表 + `DB_VERSION` 升级 + 新 sync 表 + 新行映射。
- **第二崩点：GitHub 引擎是整文件 PUT。** `githubSync.js:134-159` 每次把整张 `tables/<t>.json` 读出来、`mergeById`（`:122-131`）、再整文件 PUT；一个知识图谱节点树的并发编辑没有节点级合并/CRDT。两个家长同时改不同节点，后 push 的整文件覆盖前一个；409 只重试 1 次（`:136`、`:152`）。
- **第三崩点：树形数据与现有 `{id: row}` 契约不匹配。** 当前每表是扁平行；知识图谱是嵌套 `subjects -> nodes -> children`。要么把节点拍平成行（需要 parentId/order/版本），要么把整棵树塞进一个 JSON 字段（失去行级合并）。无论哪种，`sync.js` 的六表/行映射都要改。
- **现状证据：** `KnowledgeMap.vue:102-104` 的 `totalCount` 只统计顶层 `current.nodes.length`，子节点掌握度不汇总；完整版还要先修这个口径。
- **崩法：** 先出现「录入只在本机生效」或「两台设备改不同节点，后保存的把前者整棵树覆盖」。

### 4.4 每日复盘语音链路

- **第一崩点：没有语音输入/ASR。** `src/services/voice.js:39-48` 只有 `speechSynthesis.speak`（TTS 输出），没有 `MediaRecorder`/麦克风/上传/转写。要加语音复盘，需要录音、存储、STT、文本入库四段新能力。
- **第二崩点：没有云端入口。** `ParentDashboard.vue:346` 的 `/parse` 是文本 LLM，且只在 dev proxy（`vite.config.js:39-43`）或 LAN 服务器（`server/sync-server.mjs:163-178`）存在；GitHub Pages 上没有 `/parse`，当前会回退本地分段。语音若要 STT，同样不能在纯静态 Pages 上放 key；`MIMO_API_KEY` 目前在服务器 `.env`（`sync-server.mjs:170-177`），不能进 bundle。
- **第三崩点：音频不适合现有同步表。** `sync.js` 的六张表都是 JSON 行，GitHub Contents API 每表一个 JSON 文件（`githubSync.js:53-55`、`:94-106`）；录音是二进制大对象，塞进 `daily_homework.tasks` 会让每次 push 的整文件 PUT 变得很大。需要对象存储或至少独立 blob 表/分片。
- **第四崩点：`TodayTasks.vue` 的弹层/状态已很多。** 现有确认/临时补录/删除/变身/成就弹层（`:394-467`）都在同一文件；加录音 UI 会继续推高 1,421 行，`busy`/`confirmTask`/`showMorph` 等状态容易互相干扰。
- **崩法：** 先卡在「Pages 上没有 STT 端点」或「录音只存在本机、跨设备复盘看不到」；UI 本身不是第一障碍。

### 4.5 压力测试结论

- **先崩：`sync.js` 的六表硬编码 + 自增 id + 只 upsert 语义。** 三个新功能都需要新数据形态：猫（新表/新行）、知识图谱（树/节点）、语音（blob/转写文本）。当前同步层每加一张表要改 6 处以上，且没有删除/冲突模型，功能会以「本机可用、跨设备丢失」的形式坏掉。
- **第二个崩：`TodayTasks.vue` + `points.js`。** 新功能的 UI 和状态会继续堆进这两个文件；在没有单测的情况下，任何一次拆分/合并都会直接威胁硬规则 ②④。
- **第三个崩：`ParentDashboard` 的 `/parse` 依赖。** 语音链路需要服务端，当前只有 LAN/dev 有；GitHub Pages 静态部署无法承接。

## 5. 我没验证的部分（诚实清单）

1. **线上实际部署来源未验证。** 仓库里 `.github/workflows/deploy.yml:23-24` 是普通 `npm run build`，与「线上当前跑 GitHub 引擎（`npm run build:cloud`）」冲突。我没有访问 GitHub Pages 环境、没有看 Actions 运行记录、没有确认该 workflow 是否被禁用；因此只能确认「仓库内存在一条会把线上覆盖成 Supabase 口味的路径」，不能断言线上现在就是 Supabase。
2. **旧 Supabase 项目是否仍在线、RLS 是否仍是 anon 全权限未验证。** 我确认了 `.env.production:1-2` 被跟踪、`supabase-daily-homework.sql:14-21` 和 README 的 RLS 是 `USING (true)`；没有用该 key 发网络请求，也没有读线上库。
3. **构建产物/包体未验证。** 按约束没有运行 build，也没有读 `dist/`、`server/dist-lan/`；所以「Supabase SDK 是否被 tree-shake 出云端 bundle」没有定论。源码层面 `sync.js:8`、`githubSync.js:10` 仍无条件 import，这一点是确定的。
4. **运行时行为未实测。** 没有跑 dev/build/E2E/单测，没有在 iPad/Safari 上验证 PWA、语音、离线、30 秒轮询。所有「会复活/会不同步」的结论来自代码路径推演 + 现有 E2E 的覆盖缺口，不是现场复现。
5. **`wxc705/pikachu-data` 云端数据未读。** 没有 token，也没有访问该仓；`seed-cloud.mjs` 的漂移是从源码对比得出。
6. **`server/data/` 与 `server/dist-lan/` 未审计。** 前者是本地数据（已 gitignore），后者是构建产物（已 gitignore），按约束排除。
7. **13 个修改文件的样式差异未逐个审。** 重点改了 `sync.js`/`githubSync.js`/`db.js`/`points.js`/`TodayTasks.vue`/`KidHome.vue`/`router.js`/`main.js`/`Settings.vue`/`ParentDashboard.vue`/`build-cloud.mjs`/两个 E2E；`src/kid/kid-style.css` 的 28 行新增样式只看了 `kid-mode` 相关规则，没有逐行审视觉。
8. **死代码判定基于静态 grep。** 未用打包器/运行时确认；`v2-style.css`、`clearAll`、`getWeeklyPlan`、`todayRecommended` 等在当前 `src/` 内无引用，但外部脚本/动态 import 未完全排除。
9. **`index.html` 的 `/favicon.png` 是否被 Vite 重写未验证。** 没有 build，不把「绝对路径 404」当结论；只确认 `TodayTasks.vue` 的 `/ultraman` 已在 t019 改为相对路径（`:4`、`:8`、`:460`）。
10. **规则丢失概率是工程估计，不是统计结果。** 依据是「5 条中 4 条无单测、3 条已局部违反、规则 ④ 是组件内魔法数」；没有做重建实验。

---

**最终判断：C. 部分重写。** 先把数据层换成可迁移、可删除、可冲突合并的模型，并把 5 条硬规则抽成纯函数 + 测试；UI 和家庭业务事实保留。全量重建会把最贵的家庭规则重新猜一遍，不划算。
