"""C5 交互回归 E2E：儿童端入场动画 / 课表备注卡片 / 家长端连续审批 / 科目徽标阳性对照。

跑法（默认自动起或复用 127.0.0.1:5173）：
  python scripts/e2e-ux-regression.py

覆盖：
  1. /kid 宽屏 + 窄屏可打开；随机入场动画出现、可跳过、≤2s 自动消失、同会话不重复
  2. /kid/today 只渲染当天项（他日任务不出现；阳性对照：今日进度 + 今日任务卡）
  3. 今日无 bookNote → 「今天带什么」显示「—（待家长填写）」
  4. 家长端连续审批 3 条兑换，全程不刷新，3 条状态都落库
  5. 儿童端 .subj-tag 科目徽标仍在（Run A 阳性对照）+ C2 有值时正确列出

本脚本不依赖仓库里的旧数据：每个浏览器上下文独立，启动后先写 3 条待审、
1 条今日学校作业、1 条「非今日」任务，再开始断言。
"""
import os
import subprocess
import sys
import time
from datetime import date
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:5173"
RESULTS = []
DEV_PROC = None

SKIP_INTRO_JS = "try { sessionStorage.setItem('pikachu-points:intro-played', '1') } catch (e) {}"

SEED_JS = """
async ({ today, otherWd }) => {
  const openDb = () => new Promise((res, rej) => {
    const req = indexedDB.open('pikachu-points', 5)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  const putRows = (db, store, rows) => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    for (const row of rows) os.put(row)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  const db = await openDb()
  const now = Date.now()
  await putRows(db, 'exchange_requests', [1, 2, 3].map((n) => ({
    uid: 'e2e-req-' + n,
    id: 'e2e-req-' + n,
    reward: 'E2E 连续审批 ' + n,
    pointsCost: n,
    note: 'e2e',
    status: 'pending',
    viewed: false,
    date: today,
    createdAt: now + n,
    updatedAt: now + n
  })))
  await putRows(db, 'daily_homework', [{
    uid: 'e2e-hw-1',
    id: 'e2e-hw-1',
    date: today,
    tasks: [{ name: '语文预习第三课', points: 2, done: false, subject: '语文', minutes: 15 }],
    source: 'e2e',
    createdAt: now,
    updatedAt: now
  }])
  await putRows(db, 'weekly_tasks', [{
    uid: 'e2e-other-day',
    id: 'e2e-other-day',
    weekday: otherWd,
    timeSlot: '08:00-09:00',
    name: 'E2E仅他日任务',
    points: 1,
    category: '学习',
    sortOrder: 9999,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }])
  db.close()
  return true
}
"""

READ_REQS_JS = """
async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('pikachu-points')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  const rows = await new Promise((res, rej) => {
    const tx = db.transaction('exchange_requests', 'readonly')
    const req = tx.objectStore('exchange_requests').getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  db.close()
  return rows.filter((r) => String(r.id).startsWith('e2e-req-')).map((r) => r.status)
}
"""


def check(name, cond, extra=""):
    ok = bool(cond)
    RESULTS.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(extra)) if extra else ""))
    return ok


def server_up():
    try:
        with urlopen(BASE, timeout=1.0) as r:
            return 200 <= r.status < 500
    except Exception:
        return False


def ensure_server():
    global DEV_PROC
    if server_up():
        print("[e2e] reuse dev server on 5173")
        return
    print("[e2e] starting dev server on 5173 ...")
    cmd = "npm run dev -- --host 127.0.0.1 --port 5173"
    DEV_PROC = subprocess.Popen(
        cmd,
        cwd=ROOT,
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT
    )
    deadline = time.time() + 90
    while time.time() < deadline:
        if server_up():
            print("[e2e] dev server is up")
            return
        if DEV_PROC.poll() is not None:
            raise RuntimeError("dev server exited before becoming ready")
        time.sleep(0.5)
    raise RuntimeError("dev server did not start within 90s")


def stop_server():
    if not DEV_PROC:
        return
    try:
        subprocess.run(
            ["taskkill", "/PID", str(DEV_PROC.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False
        )
    except Exception:
        try:
            DEV_PROC.terminate()
        except Exception:
            pass


def block_offorigin(ctx):
    """C5 隔离：只允许 127.0.0.1:5173，避免 .env.development 的局域网同步
    把历史云端行（旧自增 id）拉进本次测试，污染课表断言。"""

    def handler(route):
        url = route.request.url
        if url.startswith(BASE) or url.startswith("data:") or url.startswith("blob:"):
            route.continue_()
        else:
            route.abort()

    ctx.route("**/*", handler)


def new_page(ctx, errors, viewport=(1280, 800), skip_intro=True):
    page = ctx.new_page()
    page.set_viewport_size({"width": viewport[0], "height": viewport[1]})
    if skip_intro:
        page.add_init_script(SKIP_INTRO_JS)
    page.on("pageerror", lambda e: errors.append(str(e)))
    return page


def test_intro_wide_skip(ctx, errors):
    page = new_page(ctx, errors, (1280, 800), skip_intro=False)
    page.goto(BASE + "/#/kid", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=kid-intro]", state="visible", timeout=10000)
    check("intro-wide: /kid 随机入场动画出现", page.locator("[data-testid=kid-intro]").count() == 1)
    check("intro-wide: 阳性对照 主屏标题在 (v5既有)", "今天要做的事" in page.locator(".kid-title").inner_text())
    pe = page.eval_on_selector("[data-testid=kid-intro]", "el => getComputedStyle(el).pointerEvents")
    check("intro-wide: 覆盖层不挡操作 pointer-events:none", pe == "none", pe)
    page.click("[data-testid=kid-intro-skip]")
    page.wait_for_selector("[data-testid=kid-intro]", state="detached", timeout=2000)
    check("intro-wide: 点击「跳过」立即消失", page.locator("[data-testid=kid-intro]").count() == 0)

    page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector(".tt-xp-section", timeout=15000)
    page.wait_for_timeout(400)
    check("intro-wide: 同会话 /kid/today 不重复骚扰", page.locator("[data-testid=kid-intro]").count() == 0)
    page.close()


def test_intro_narrow_auto(ctx, errors):
    page = new_page(ctx, errors, (375, 700), skip_intro=False)
    page.goto(BASE + "/#/kid", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=kid-intro]", state="visible", timeout=10000)
    check("intro-narrow: 窄屏 /kid 入场动画出现", page.locator("[data-testid=kid-intro]").count() == 1)
    check("intro-narrow: 阳性对照 主屏标题在 (v5既有)", "今天要做的事" in page.locator(".kid-title").inner_text())
    t0 = time.monotonic()
    page.wait_for_selector("[data-testid=kid-intro]", state="detached", timeout=2500)
    elapsed = time.monotonic() - t0
    check("intro-narrow: ≤2s 自动消失、不再遮挡", elapsed <= 2.0, f"{elapsed:.2f}s")

    page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector(".tt-tabs", timeout=15000)
    page.wait_for_timeout(1200)
    check("intro-narrow: 同会话切换今日任务不重复播", page.locator("[data-testid=kid-intro]").count() == 0)
    page.close()


def test_today_only(ctx, errors):
    page = new_page(ctx, errors, (1280, 800))
    page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector(".tt-xp-section", timeout=15000)
    page.wait_for_selector(".tt-task", timeout=15000)
    check("today: 阳性对照 今日进度 在 (v5既有)", "今日进度" in page.content())
    check("today: 今日任务卡 >0 (阳性对照)", page.locator(".tt-task").count() > 0, page.locator(".tt-task").count())
    other = page.locator(".tt-task:has-text('E2E仅他日任务')").count()
    check("today: 只渲染当天项，他日任务不出现", other == 0, f"other-day cards={other}")
    page.close()


def test_books_empty_and_positive(ctx, errors, wd):
    # 3a：宽屏空态
    page = new_page(ctx, errors, (1280, 800))
    page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=books-card]", timeout=15000)
    empty = page.locator("[data-testid=books-empty]")
    check("books: 无 bookNote 时显示空态文案", empty.count() == 1 and "待家长填写" in empty.inner_text())
    check("books: 宽屏侧栏入口存在", page.locator("[data-testid=books-entry-sidebar]").count() == 1)
    check("books: 阳性对照 科目徽标 .subj-tag 在 (Run A)", page.locator(".subj-tag").count() >= 1)
    page.close()

    # 3b：窄屏底部卡片
    page2 = new_page(ctx, errors, (375, 700))
    page2.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page2.wait_for_selector(".tt-tabs", timeout=15000)
    bottom = page2.locator("[data-testid=books-entry-bottom]")
    check("books: 窄屏底部卡片存在", bottom.count() == 1)
    check("books: 窄屏底部卡片显示待填写空态", "待家长填写" in bottom.inner_text())
    bottom.click()
    page2.wait_for_timeout(500)
    check("books: 点击底部卡片定位到主卡片", page2.locator("[data-testid=books-card]").count() == 1)
    page2.close()

    # 3c：家长端行内编辑 → 儿童端有值列表；家长端接送汇总
    page3 = new_page(ctx, errors, (390, 800))
    page3.goto(BASE + "/#/projects", wait_until="domcontentloaded", timeout=30000)
    book_in = page3.locator(f'[data-weekday="{wd}"] [data-testid=weekly-task-bookNote]').first
    book_in.wait_for(state="visible", timeout=15000)
    ph = book_in.get_attribute("placeholder") or ""
    check("c2: bookNote 输入框有用途提示 placeholder", "带什么书" in ph, ph)
    check("c2: bookNote 未预填示例值", book_in.input_value() == "", book_in.input_value())
    book_in.fill("语文书 + 数学练习册")
    book_in.press("Tab")
    page3.wait_for_timeout(800)

    pickup_in = page3.locator(f'[data-weekday="{wd}"] [data-testid=weekly-task-pickupNote]').first
    check("c2: pickupNote 输入框有用途提示 placeholder", "接送" in (pickup_in.get_attribute("placeholder") or ""))
    pickup_in.fill("奶奶 16:30 校门口")
    pickup_in.press("Tab")
    page3.wait_for_timeout(900)

    page3.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page3.wait_for_selector("[data-testid=book-note]", timeout=15000)
    note = page3.locator("[data-testid=book-note]").first.inner_text()
    check("c2: 儿童端列出 bookNote 有值的行", "语文书" in note, note)

    page3.goto(BASE + "/#/parent", wait_until="domcontentloaded", timeout=30000)
    page3.wait_for_selector("[data-testid=pickup-card]", timeout=15000)
    pickup_text = page3.locator("[data-testid=pickup-card]").inner_text()
    check("c2: 家长端接送安排汇总 pickupNote", "奶奶 16:30" in pickup_text, pickup_text.replace("\n", " | "))
    page3.close()


def test_parent_approvals(ctx, errors):
    page = new_page(ctx, errors, (390, 800))
    page.goto(BASE + "/#/parent", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=pending-row]", timeout=15000)
    check("approve: 阳性对照 3 条待审兑换", page.locator("[data-testid=pending-row]").count() == 3)
    check("approve: 标题计数为 3", "待确认兑换（3）" in page.content())

    page.evaluate("window.__noRefreshMarker = 'alive'")
    for _ in range(3):
        before = page.locator("[data-testid=pending-row]").count()
        page.locator("[data-testid=pending-approve]").first.click()
        page.wait_for_function(
            "(n) => document.querySelectorAll('[data-testid=pending-row]').length === n",
            arg=before - 1,
            timeout=8000
        )
    check("approve: 连续 3 条后待审列表清空", page.locator("[data-testid=pending-row]").count() == 0)
    check(
        "approve: 最近审批 3 条均标记通过",
        page.locator("[data-testid=approval-log] [data-status=approved]").count() == 3
    )
    check(
        "approve: 全程无刷新（页面 JS 标记仍在）",
        page.evaluate("window.__noRefreshMarker") == "alive"
    )

    page.wait_for_timeout(1200)  # 等最后一条 IndexedDB 落库
    statuses = page.evaluate(READ_REQS_JS)
    check("approve: 3 条状态都落库为 approved", len(statuses) == 3 and all(s == "approved" for s in statuses), statuses)
    check("approve: 无重复请求（仍是 3 条）", len(statuses) == 3, len(statuses))
    page.close()


def test_subj_tag_positive(ctx, errors):
    page = new_page(ctx, errors, (1280, 800))
    page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector(".subj-tag", timeout=15000)
    tag = page.locator(".subj-tag").first.inner_text()
    check("subj: 儿童端 .subj-tag 科目徽标仍在 (Run A)", tag.strip() != "", tag)
    check("subj: 阳性对照 学校任务列在 (v5既有)", "学校任务" in page.content())
    page.close()


def seed_data(page, today, wd):
    page.goto(BASE + "/#/parent", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=pickup-card]", timeout=20000)
    page.wait_for_timeout(1200)  # 等 store.load 建库 + 首次课表种子
    page.evaluate(SEED_JS, {"today": today, "otherWd": wd % 7 + 1})
    page.reload(wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("[data-testid=pending-row]", timeout=15000)
    check("seed: 3 条待审数据已写入", page.locator("[data-testid=pending-row]").count() == 3)


def run_case(name, fn):
    try:
        fn()
    except Exception as e:
        RESULTS.append((name + " crashed", False))
        print("FAIL " + name + " crashed | " + repr(e))


def main():
    errors = []
    ensure_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context()
            block_offorigin(ctx)
            today = date.today().isoformat()
            wd = date.today().isoweekday()
            boot = new_page(ctx, errors, (390, 800))
            seed_data(boot, today, wd)
            boot.close()

            run_case("intro-wide", lambda: test_intro_wide_skip(ctx, errors))
            run_case("intro-narrow", lambda: test_intro_narrow_auto(ctx, errors))
            run_case("today-only", lambda: test_today_only(ctx, errors))
            run_case("books", lambda: test_books_empty_and_positive(ctx, errors, wd))
            run_case("approvals", lambda: test_parent_approvals(ctx, errors))
            run_case("subj-tag", lambda: test_subj_tag_positive(ctx, errors))

            browser.close()
    finally:
        stop_server()

    check("全程无未捕获页面 JS 错误", not errors, errors[:5])
    fails = [n for n, ok in RESULTS if not ok]
    print(f"\n=== C5 E2E done: {len(RESULTS)} checks, {len(fails)} failed ===")
    if fails:
        for n in fails:
            print("  FAILED: " + n)
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
