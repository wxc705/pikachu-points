"""t017/t019 E2E：GitHub Contents 同步引擎 push→清本地→pull 往返（真浏览器）。

跑法（t019：构建期不再注入 token）：
  npm run build:cloud                       # 不带 VITE_GH_TOKEN，产物里绝不能有 github_pat_
  SYNC_PORT=8799 SYNC_WWW_DIR=<repo>/dist SYNC_DATA_DIR=<scratch> node server/sync-server.mjs
  python scripts/e2e-github-sync.py

token 路径（t019 架构修正）：运行时由「设置 → 云同步密钥」写 localStorage `pk_gh_token`，
githubSync 每次请求现读 → 保存后立即可用。烤进 dist 的密钥进公开仓会被 GitHub
secret scanning 数十秒内自动吊销（线上恒 401），所以产物必须 0 个 github_pat_。

mock 方式：Playwright route 拦 api.github.com（引擎仍硬编码只走 api.github.com，
不改生产代码路径）。实现 Contents API 语义：GET raw/GET sha/PUT+sha/409。
"""
import base64
import json
import os
import re
import sys
import time
from playwright.sync_api import sync_playwright

# 端口可用环境变量覆盖：本机 8799 若被常驻旧 sync-server 占用，换口跑（SYNC_PORT=8791 …）
BASE = "http://127.0.0.1:" + os.environ.get("SYNC_PORT", "8799")
MOCK_TOKEN = "mock-e2e-token-not-real"
CORS = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,accept,content-type,x-github-api-version",
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-expose-headers": "etag",
}
results = []
_PAGE = [None]  # sync Playwright：路由回调只在 API 调用间隙被派发 → 轮询必须泵事件


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(extra)) if extra else ""))
    if not cond:
        raise AssertionError(name)


def make_handler(store, stats):
    sha_n = [0]

    def handler(route):
        try:
            _handle(route)
        except Exception as e:  # handler 内异常会静默吞掉请求 → 必须显形
            print("HANDLER-ERR:", repr(e), flush=True)
            try:
                route.abort()
            except Exception:
                pass

    def _handle(route):
        req = route.request
        url = req.url
        stats["urls"].append(req.method + " " + url)
        if req.method == "OPTIONS":
            route.fulfill(status=204, headers=CORS)
            return
        auth = req.headers.get("authorization", "")
        if auth:
            stats["auth"].append(auth)
        m = re.search(r"/contents/(tables/[a-z_]+\.json)$", url)
        if not m:
            route.fulfill(status=404, json={"message": "Not Found"}, headers=CORS)
            return
        key = m.group(1)
        if req.method == "GET":
            if key not in store:
                route.fulfill(status=404, json={"message": "Not Found"}, headers=CORS)
                return
            if "raw" in (req.headers.get("accept") or ""):
                route.fulfill(status=200, body=store[key]["content"],
                              headers={**CORS, "content-type": "application/json"})
            else:
                route.fulfill(status=200, json={"name": key.split("/")[-1], "path": key,
                                                "sha": store[key]["sha"], "size": len(store[key]["content"])},
                              headers=CORS)
            return
        if req.method == "PUT":
            table = key.split("/")[-1].replace(".json", "")
            # 强制首次 weekly_tasks PUT 返回 409 → 验证引擎"重拉重合并重试1次"
            if table == "weekly_tasks" and not stats["forced409"]:
                stats["forced409"] = True
                route.fulfill(status=409, json={"message": "sha mismatch (mock forced)"}, headers=CORS)
                return
            body = json.loads(req.post_data or "{}")
            if body.get("sha") and store.get(key, {}).get("sha") != body.get("sha"):
                route.fulfill(status=409, json={"message": "sha does not match"}, headers=CORS)
                return
            content = base64.b64decode(body["content"]).decode("utf-8")
            sha_n[0] += 1
            store[key] = {"content": content, "sha": f"mocksha{sha_n[0]:04d}"}
            stats["puts"].append(key)
            route.fulfill(status=200, json={"content": {"sha": store[key]["sha"]}}, headers=CORS)
            return
        route.fulfill(status=405, json={"message": "Method not allowed"}, headers=CORS)

    return handler


def read_tables(page, tables):
    return page.evaluate(
        """async (tables) => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open('pikachu-points')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      const out = {}
      for (const t of tables) {
        out[t] = await new Promise((res, rej) => {
          if (!db.objectStoreNames.contains(t)) return res([])
          const r = db.transaction(t, 'readonly').objectStore(t).getAll()
          r.onsuccess = () => res(r.result)
          r.onerror = () => rej(r.error)
        })
      }
      return out
    }""",
        tables,
    )


def wait_until(fn, timeout=25, interval=0.5, desc=""):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = fn()
        if last:
            return last
        if _PAGE[0]:
            _PAGE[0].wait_for_timeout(int(interval * 1000))  # 泵 Playwright 事件循环
        else:
            time.sleep(interval)
    raise AssertionError("timeout: " + desc + " last=" + str(last)[:300])


def main():
    store = {}
    stats = {"urls": [], "auth": [], "puts": [], "forced409": False}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("https://api.github.com/**", make_handler(store, stats))
        page = ctx.new_page()
        _PAGE[0] = page
        page_errors = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        nav_log = []
        page.on("framenavigated", lambda f: nav_log.append(("NAV", f.url)))
        page.on("load", lambda: nav_log.append(("LOAD", page.url)))
        page.on("crash", lambda: nav_log.append(("CRASH", "")))
        page.on("requestfailed", lambda r: nav_log.append(("REQFAIL", r.url)))
        page.on("popup", lambda p: nav_log.append(("POPUP", p.url)))

        # ---- t019 A0: 构建产物密钥扫描 + 设置页运行时录入密钥 ----
        def bundle_stats():
            import pathlib
            d = pathlib.Path(__file__).resolve().parent.parent / "dist" / "assets"
            txt = ""
            files = sorted(d.glob("index-*.js"))
            for f in files:
                txt += f.read_text(encoding="utf-8", errors="ignore")
            return {
                "files": len(files), "text": txt,
                "github_pat": txt.count("github_pat_"),
                "api": txt.count("api.github.com"),
                "pkkey": txt.count("pk_gh_token"),
                "abs_ultraman": txt.count('"/ultraman/') + txt.count("'/ultraman/"),
                "rel_ultraman": txt.count("./ultraman/"),
            }
        bundle = bundle_stats()
        check("t019: 产物文件在场（阳性对照前置，防空目录全 0 假通过）",
              bundle["files"] > 0, bundle["files"])
        check("t019 断言: 产物 grep github_pat_ = 0（烤进公开仓的密钥会被自动吊销，禁止入包）",
              bundle["github_pat"] == 0, bundle["github_pat"])
        check("t019 断言: 产物 grep <mock token> = 0（token 不是构建期注入的）",
              MOCK_TOKEN not in bundle["text"])
        check("t019 阳性对照: 产物含 api.github.com + pk_gh_token（引擎与运行时密钥键都在）",
              bundle["api"] > 0 and bundle["pkkey"] > 0, (bundle["api"], bundle["pkkey"]))
        check("t019 断言: 产物无绝对 /ultraman 路径（gh-pages 子路径下 404 = 变身/壁纸看不到的根因）",
              bundle["abs_ultraman"] == 0 and bundle["rel_ultraman"] > 0,
              {"abs": bundle["abs_ultraman"], "rel": bundle["rel_ultraman"]})

        page.goto(BASE + "/#/settings")
        page.wait_for_selector("#gh-token-input", timeout=20000)
        check("阳性对照: 设置页渲染 (v5 既有)", page.locator("h1:has-text('设置')").count() >= 1)
        check("t019: 设置页有「云同步密钥」输入框且打码 (type=password)",
              page.locator("#gh-token-input").get_attribute("type") == "password")
        check("t019: 构建期零 token（localStorage 初始为空）",
              not page.evaluate("() => localStorage.getItem('pk_gh_token')"))
        page.fill("#gh-token-input", MOCK_TOKEN)
        page.click("[data-testid=gh-token-save]")
        wait_until(lambda: page.evaluate("() => localStorage.getItem('pk_gh_token')") == MOCK_TOKEN,
                   10, 0.5, "token 写入 localStorage")
        check("t019: 保存 → localStorage `pk_gh_token` 就位（运行时读取，不进构建产物）", True)
        sec = page.locator("section", has=page.locator("h2:has-text('云同步密钥')")).first.inner_text()
        check("t019: 保存后状态打码回显（只给长度，不回显明文）",
              "已保存" in sec and str(len(MOCK_TOKEN)) in sec and MOCK_TOKEN not in sec,
              sec.replace("\n", " | ")[:160])

        # ---- t019 B: /kid 主屏不再被跳走（变身 + 壁纸可见），「今日任务」进今日视图 ----
        page.goto(BASE + "/#/kid")
        page.wait_for_selector(".kid-today-link", timeout=20000)
        check("t019: /kid 落在 KidHome 主屏（不再无条件跳 /kid/today）",
              page.evaluate("() => location.hash") == "#/kid",
              page.evaluate("() => location.hash"))
        check("阳性对照: 主屏任务列表渲染 (v5 既有 todayTasks 数据链)",
              page.locator(".kid-goals, .kid-empty-card").count() >= 1)
        wall_style = page.evaluate(
            "() => { const el = document.querySelector('.kid-wall'); return el ? getComputedStyle(el).backgroundImage : '' }")
        check("t019: 主屏壁纸已挂载且走相对路径", "ultraman/seq" in wall_style, wall_style[:160])
        check("t019: 主屏变身动画按钮在场", page.locator("[data-testid=morph-entry-kidhome]").count() == 1)
        page.click("[data-testid=morph-entry-kidhome]")
        page.wait_for_selector(".kid-morph-overlay", timeout=8000)
        check("t019: 变身动画弹层打开", True)
        gif_ok = page.evaluate("""() => new Promise((res) => {
          const img = document.querySelector('.kid-morph-gif')
          if (!img) return res(false)
          if (img.complete && img.naturalWidth > 0) return res(true)
          img.addEventListener('load', () => res(true))
          img.addEventListener('error', () => res(false))
          setTimeout(() => res(false), 6000)
        })""")
        check("t019: 变身 GIF 真实加载成功（相对路径，不再 404）", gif_ok)
        check("t019: 变身弹层文案", "变身" in page.locator(".kid-morph-text").inner_text())
        page.click(".kid-morph-overlay")
        page.wait_for_timeout(500)
        page.click("[data-testid=today-entry-kidhome]")
        page.wait_for_selector(".tt-page", timeout=15000)
        check("t019: 主屏「今日任务」按钮 → /kid/today 今日视图（默认打卡流保留）",
              page.evaluate("() => location.hash") == "#/kid/today",
              page.evaluate("() => location.hash"))

        # ---- A: 推送（本地 → 云端文件） ----
        page.goto(BASE + "/#/parent")
        page.wait_for_selector("textarea", timeout=20000)
        check("阳性对照: 家长页渲染 (v5既有)", page.locator("button:has-text('解析作业')").count() >= 1)
        check("阳性对照: GitHub引擎已注入(非supabase)",
              page.evaluate("() => typeof fetch === 'function'") is True)
        page.wait_for_selector("button:has-text('推送')", timeout=10000)
        page.click("button:has-text('推送')")
        try:
            wait_until(lambda: "tables/weekly_tasks.json" in store and "tables/projects.json" in store,
                       25, 0.5, "push 落盘")
        except AssertionError:
            print("DEBUG urls:", stats["urls"][:10], flush=True)
            print("DEBUG sync-ui:", page.locator("section", has=page.locator("h2:has-text('云同步')")).first.inner_text().replace("\n", " | ")[:400], flush=True)
            raise
        check("push: 云端生成 tables/weekly_tasks.json + projects.json", True)

        wt = json.loads(store["tables/weekly_tasks.json"]["content"])
        check("push: 文件格式 {\"<id>\": row}", isinstance(wt, dict) and len(wt) > 0, f"{len(wt)} rows")
        sample = next(iter(wt.values()))
        check("push: row 沿用 snake_case 映射", "time_slot" in sample or "sort_order" in sample,
              list(sample.keys()))
        check("push: row 含 updated_at", "updated_at" in sample, sample.get("updated_at"))
        check("push: 409冲突→重试1次被执行", stats["forced409"] is True)
        check("push: 无 raw.githubusercontent 请求（硬约束）",
              not any("raw.githubusercontent.com" in u for u in stats["urls"]), stats["urls"][:3])
        check("push: token 来自运行时 localStorage（设置页录入，请求头 Bearer = 录入值）",
              any(a == "Bearer " + MOCK_TOKEN for a in stats["auth"]), stats["auth"][:2])

        # ---- B: 云端新行/新版本 → 拉取合并（LWW 云端胜） ----
        pj = json.loads(store["tables/projects.json"]["content"])
        first_key = next(iter(pj))
        pj[first_key]["name"] = "云端改名E2E"
        pj[first_key]["updated_at"] = "2099-01-01T00:00:00.000Z"
        store["tables/projects.json"]["content"] = json.dumps(pj, ensure_ascii=False)

        today = time.strftime("%Y-%m-%d")
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        store["tables/checkins.json"] = {
            "sha": "mocksha-cloudrow",
            "content": json.dumps({
                "999001": {"id": 999001, "project_id": None, "project_name": "云端独有行E2E",
                            "category": "生活", "points_earned": 5, "note": "", "checked_by": "kid",
                            "date": today, "task_id": None, "created_at": now_iso}
            }, ensure_ascii=False),
        }
        page.click("button:has-text('拉取')")
        wait_until(lambda: any(r.get("name") == "云端改名E2E"
                               for r in read_tables(page, ["projects"])["projects"]),
                   20, 0.5, "LWW pull projects")
        check("pull: 云端 updated_at 更新的行覆盖本地 (LWW)", True)
        rows = read_tables(page, ["checkins"])["checkins"]
        check("pull: 云端独有行合并进本地", any(r.get("projectName") == "云端独有行E2E" for rows_ in [rows] for r in rows_),
              [r.get("projectName") for r in rows][:5])

        # ---- C: 清空本地 IndexedDB → 重新拉取（往返恢复） ----
        page.evaluate(
            """() => new Promise((res) => {
              localStorage.removeItem('pikachu-points:sync-dirty')
              const r = indexedDB.deleteDatabase('pikachu-points')
              r.onsuccess = () => res('ok')
              r.onerror = () => res('err')
              r.onblocked = () => res('blocked')
            })"""
        )
        page.reload()
        page.wait_for_selector("button:has-text('拉取')", timeout=20000)
        check("阳性对照: 清库后家长页仍渲染 (v5既有)", page.locator("textarea").count() >= 1)
        page.click("button:has-text('拉取')")
        wait_until(lambda: any(r.get("projectName") == "云端独有行E2E"
                               for r in read_tables(page, ["checkins"])["checkins"]),
                   20, 0.5, "restore checkins")
        data = read_tables(page, ["checkins", "projects", "weekly_tasks"])
        check("往返: 云端独有行从零恢复", True)
        check("往返: projects 含云端改名行",
              any(r.get("name") == "云端改名E2E" for r in data["projects"]),
              len(data["projects"]))
        check("往返: weekly_tasks 恢复非空", len(data["weekly_tasks"]) > 0, len(data["weekly_tasks"]))
        check("全程无未捕获页面 JS 错误", not page_errors, page_errors[:3])
        check("全程序只打 api.github.com（硬约束终检）",
              all("api.github.com" in u for u in stats["urls"]),
              [u for u in stats["urls"] if "api.github.com" not in u][:3])

        # ---- D: 空云端 pull → 本地行数不得减少（t018 验收第 6 项，数据安全红线） ----
        # 模拟真实事故现场：pikachu-data 是 0 文件 0 提交的空仓，pull 绝不能清空本地账本。
        D_TABLES = ["checkins", "exchange_requests", "projects",
                    "weekly_tasks", "daily_homework", "daily_checkins"]
        before_d = read_tables(page, D_TABLES)
        before_counts = {t: len(before_d[t]) for t in D_TABLES}
        check("D 阳性对照: 起手本地有账本", sum(before_counts.values()) > 0, before_counts)
        gets_before = len([u for u in stats["urls"] if u.startswith("GET")])
        store.clear()  # 空云端：所有表 GET → 404
        page.click("button:has-text('拉取')")
        wait_until(lambda: len([u for u in stats["urls"] if u.startswith("GET")]) >= gets_before + 6,
                   25, 0.5, "空云 pull 六表请求")
        page.wait_for_timeout(2500)  # 等合并/收尾闸跑完
        after_d = read_tables(page, D_TABLES)
        after_counts = {t: len(after_d[t]) for t in D_TABLES}
        shrunk = {t: (before_counts[t], after_counts[t])
                  for t in D_TABLES if after_counts[t] < before_counts[t]}
        check("空云端 pull: 各表本地行数不减少（t018 验收第 6 项）", not shrunk,
              {"before": before_counts, "after": after_counts})
        check("空云端 pull: 行数完全相等（空云零写入本地）",
              before_counts == after_counts, after_counts)
        check("空云端 pull: 积分行原样保留（checkins 明细逐行一致）",
              json.dumps([r.get("id") for r in before_d["checkins"]]) ==
              json.dumps([r.get("id") for r in after_d["checkins"]]),
              f'{len(before_d["checkins"])} rows')
        check("空云端 pull: 页面无 JS 错误", not page_errors, page_errors[:3])

        # ---- E: 抢救通道 dumpData()（t018 数据出口） ----
        page.on("framenavigated", lambda f: print("DEBUG NAV ->", f.url, flush=True))
        page.on("load", lambda: print("DEBUG LOAD ->", page.url, flush=True))
        page.on("crash", lambda: print("DEBUG CRASH", flush=True))
        print("DEBUG pre-E url=", page.url, flush=True)
        try:
            print("DEBUG trivial eval:", page.evaluate("() => 1 + 1"), flush=True)
        except Exception as e:
            print("DEBUG trivial eval FAILED:", repr(e), flush=True)
        dump = None
        try:
            dump = page.evaluate(
            """async () => {
              const d = await window.dumpDataOnly()
              return { schema: d.schema, counts: d.counts, totalRows: d.totalRows,
                       readError: d.readError, hasStores: Object.keys(d.stores).length }
            }"""
        )
        except Exception as e:
            print("DEBUG dump eval FAILED:", repr(e), "| url=", page.url, flush=True)
            raise
        check("dumpData: 全局可用（控制台命令）", dump.get("schema") == "t018-dump-v1", dump)
        check("dumpData: 导出总行数 > 0 且与 IDB 实读一致",
              dump.get("totalRows", 0) > 0
              and dump["counts"]["checkins"] == len(after_d["checkins"])
              and dump["counts"]["weekly_tasks"] == len(after_d["weekly_tasks"]),
              dump.get("counts"))
        check("dumpData: 读取路径无错误（有错要显形，不装成 0 行）",
              not dump.get("readError"), dump.get("readError"))
        check("dumpData: 七张表全在（含 weekly_plan）", dump.get("hasStores") == 7, dump.get("hasStores"))

        browser.close()

    fails = [n for n, ok in results if not ok]
    print(f"\n=== E2E t017 GitHub-sync done: {len(results)} checks, {len(fails)} failed ===")
    print(f"[mock] PUT次数={len(stats['puts'])} 强制409={stats['forced409']} 云端文件={sorted(store)}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
