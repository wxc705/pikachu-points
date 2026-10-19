"""v6 P2 E2E：作业 subject/minutes/note 入库 + 儿童端科目显示 + 同步白名单。

两种模式：
  python scripts/e2e-homework-subject.py dev
      # 针对 dev server (5173)：解析→保存→IDB 校验→儿童端科目徽标→老行零迁移兼容
  python scripts/e2e-homework-subject.py sync <base_url> <daily_homework.json路径>
      # 针对沙箱同步服务器（独立端口+独立数据目录，不碰 8787 真实数据）：
      # A 端解析保存→推送→沙箱落盘含 subject/minutes/note
      # B 端(全新 IDB)拉取→儿童端显示科目（证明 push/pull 白名单不丢字段）

断言均带阳性对照（先确认 v5 既有特性在，再验新特性）。
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright, expect

HW_TEXT = "语文：抄写第3课生字两遍\n数学：口算20道\n背诵《春天》周五交"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(extra)) if extra else ""))
    if not cond:
        raise AssertionError(name)


def fill_and_parse(page, base):
    page.goto(base + "/#/parent")
    page.wait_for_selector("textarea", timeout=15000)
    # 阳性对照：v5 既有解析按钮
    check("阳性对照: 解析作业按钮在 (v5既有)", page.locator("button:has-text('解析作业')").count() >= 1)
    page.fill("textarea", HW_TEXT)
    page.click("button:has-text('解析作业')")
    # 等解析结果出现（AI 失败会回退本地分段，本地分段没有 subject → 下面断言会抓到）
    page.wait_for_selector("p:has-text('解析结果')", timeout=30000)
    preview = page.locator("p:has-text('解析结果')").first.locator("xpath=..")
    ptxt = preview.inner_text()
    check("解析预览含科目 (v5既有)", ("语文" in ptxt and "数学" in ptxt), ptxt.replace("\n", " | ")[:200])
    engine = page.locator("p:has-text('智能解析结果')").count()
    check("解析引擎=AI(/parse 主路径)", engine >= 1, "fallback to local split" if not engine else "")
    page.click("button:has-text('保存')")
    page.wait_for_selector("p:has-text('已追加')", timeout=10000)
    return ptxt


def read_hw_rows(page):
    return page.evaluate(
        """async () => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open('pikachu-points')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      const rows = await new Promise((res, rej) => {
        const r = db.transaction('daily_homework', 'readonly').objectStore('daily_homework').getAll()
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      return rows.map(h => ({ date: h.date, source: h.source, tasks: h.tasks }))
    }"""
    )


def mode_dev(browser):
    page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    base = "http://127.0.0.1:5173"
    ptxt = fill_and_parse(page, base)

    rows = read_hw_rows(page)
    today = time.strftime("%Y-%m-%d")
    entry = next((r for r in rows if r["date"] == today), None)
    check("IDB 今日 daily_homework 行存在", entry is not None, rows)
    tasks = entry["tasks"] if entry else []
    with_subject = [t for t in tasks if t.get("subject")]
    with_minutes = [t for t in tasks if isinstance(t.get("minutes"), (int, float))]
    check("入库行带 subject (P2 核心)", len(with_subject) >= 1, with_subject)
    check("入库行带 minutes (P2 核心)", len(with_minutes) >= 1, [t.get("minutes") for t in tasks])
    if "周五交" in ptxt:  # 预览里出现了截止日 → 入库必须保留（防"预览有、入库丢"）
        notes = [t.get("note") for t in tasks if t.get("note")]
        check("预览出现的 note 已入库", len(notes) >= 1, notes)
    check("done 字段仍在（v5 语义不破）", all("done" in t for t in tasks), tasks)

    # 儿童端显示科目
    page.goto(base + "/#/kid/today")
    page.wait_for_selector(".tt-xp-section", timeout=15000)
    check("阳性对照: 今日进度在 (v5既有)", "今日进度" in page.content())
    page.wait_for_selector(".tt-task", timeout=15000)
    badges = page.locator(".tt-task .subj-tag")
    check("儿童端作业行显示科目徽标", badges.count() >= 1, badges.count())
    btexts = [badges.nth(i).inner_text().strip() for i in range(badges.count())]
    check("徽标为真实科目名", any(t in ("语文", "数学", "英语", "其他") for t in btexts), btexts)

    # 零迁移兼容：儿童端临时补录 = v5 老行结构 {name,points,done}（无 subject）
    n_before = page.locator(".tt-task").count()
    page.locator(".tt-temp-add").first.click()  # 两栏各有一个补录按钮，取「学校作业」栏第一个
    page.fill(".tt-temp-input", "读课文E2E老行")
    page.click(".tt-confirm-yes")
    page.wait_for_function(f"document.querySelectorAll('.tt-task').length > {n_before}", timeout=10000)
    n_after = page.locator(".tt-task").count()
    m_after = page.locator(".tt-task .subj-tag").count()
    check("老行(无subject)正常渲染不报错", n_after == n_before + 1 and m_after == badges.count(),
          f"cards {n_before}->{n_after}, badges {m_after}")
    check("老行卡片存在且无徽标",
          page.locator(".tt-task:has-text('读课文E2E老行')").count() == 1
          and page.locator(".tt-task:has-text('读课文E2E老行') .subj-tag").count() == 0)

    rows2 = read_hw_rows(page)
    entry2 = next((r for r in rows2 if r["date"] == today), None)
    kinds = [("new" if t.get("subject") else "old") for t in (entry2["tasks"] if entry2 else [])]
    check("同一行新老任务并存（零迁移）", "new" in kinds and "old" in kinds, kinds)

    check("全程无未捕获页面 JS 错误", not errors, errors[:3])


def mode_sync(browser, base, hw_json_path):
    # ---- A 端：解析保存 → 手动推送 → 沙箱落盘校验 ----
    ctx_a = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx_a.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    fill_and_parse(page, base)

    page.wait_for_selector("button:has-text('推送')", timeout=10000)
    check("阳性对照: 同步按钮在 (v5既有)", page.locator("button:has-text('同步')").count() >= 1)
    page.click("button:has-text('推送')")

    deadline = time.time() + 25
    cloud = None
    while time.time() < deadline:
        try:
            with open(hw_json_path, encoding="utf-8") as f:
                data = json.load(f)
            rows = list(data.values()) if isinstance(data, dict) else data
            hit = [r for r in rows if any(t.get("subject") for t in (r.get("tasks") or []))]
            if hit:
                cloud = hit[0]
                break
        except FileNotFoundError:
            pass
        time.sleep(1)
    check("推送后沙箱 daily_homework 带 subject (push 白名单)", cloud is not None,
          "25s 内未在 %s 看到 subject" % hw_json_path)
    ctasks = cloud["tasks"]
    check("push: minutes 保留", any(isinstance(t.get("minutes"), (int, float)) for t in ctasks),
          [(t.get("name"), t.get("minutes")) for t in ctasks])
    check("push: note 保留", any(t.get("note") for t in ctasks),
          [(t.get("name"), t.get("note")) for t in ctasks])
    ctx_a.close()

    # ---- B 端：全新 IDB → 拉取 → 儿童端显示科目（pull 白名单） ----
    ctx_b = browser.new_context(viewport={"width": 1280, "height": 800})
    page_b = ctx_b.new_page()
    page_b.on("pageerror", lambda e: errors.append(str(e)))
    page_b.goto(base + "/#/parent")
    page_b.wait_for_selector("button:has-text('拉取')", timeout=15000)
    check("阳性对照: B端家长页渲染 (v5既有)", page_b.locator("textarea").count() >= 1)
    page_b.click("button:has-text('拉取')")

    deadline = time.time() + 20
    rows_b = []
    while time.time() < deadline:
        rows_b = read_hw_rows(page_b)
        if any(t.get("subject") for r in rows_b for t in (r.get("tasks") or [])):
            break
        time.sleep(1)
    check("pull: B 端 IDB 行带 subject", any(t.get("subject") for r in rows_b for t in (r.get("tasks") or [])),
          rows_b)

    page_b.goto(base + "/#/kid/today")
    page_b.wait_for_selector(".tt-task", timeout=15000)
    check("阳性对照: B端今日进度 (v5既有)", "今日进度" in page_b.content())
    badges = page_b.locator(".tt-task .subj-tag")
    check("pull: B 端儿童端显示科目徽标", badges.count() >= 1,
          [badges.nth(i).inner_text() for i in range(badges.count())])
    check("全程无未捕获页面 JS 错误", not errors, errors[:3])
    ctx_b.close()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dev"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            if mode == "dev":
                mode_dev(browser)
            elif mode == "sync":
                mode_sync(browser, sys.argv[2], sys.argv[3])
            else:
                raise SystemExit("usage: e2e-homework-subject.py dev|sync <base> <hw_json>")
        finally:
            browser.close()
    fails = [n for n, ok in results if not ok]
    print(f"\n=== E2E P2[{mode}] done: {len(results)} checks, {len(fails)} failed ===")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
