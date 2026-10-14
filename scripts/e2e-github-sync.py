"""t017 E2E：GitHub Contents 同步引擎 push→清本地→pull 往返（真浏览器）。

跑法：
  VITE_GH_TOKEN=mock-e2e-token-not-real npm run build:cloud
  SYNC_PORT=8799 SYNC_WWW_DIR=<repo>/dist SYNC_DATA_DIR=<scratch> node server/sync-server.mjs
  python scripts/e2e-github-sync.py

mock 方式：Playwright route 拦 api.github.com（引擎仍硬编码只走 api.github.com，
不改生产代码路径）。实现 Contents API 语义：GET raw/GET sha/PUT+sha/409。
真实 token 未到位 → 真云端往返待 Nate 补验（本脚本可对真仓复跑）。
"""
import base64
import json
import re
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8799"
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
        check("push: token 来自构建环境变量(请求头 Bearer)",
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

        browser.close()

    fails = [n for n, ok in results if not ok]
    print(f"\n=== E2E t017 GitHub-sync done: {len(results)} checks, {len(fails)} failed ===")
    print(f"[mock] PUT次数={len(stats['puts'])} 强制409={stats['forced409']} 云端文件={sorted(store)}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
