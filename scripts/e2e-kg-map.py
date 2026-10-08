"""v6 P1 E2E：知识图谱 B-lite（只读冒险地图）真浏览器验收。

跑法：
  1. npm run dev -- --host 127.0.0.1 --port 5173
  2. python scripts/e2e-kg-map.py

断言（每条都带阳性对照，防"全 0 假通过"）：
  - 儿童端入口存在且能跳到 #/map（宽屏侧栏 / 窄屏底 tab / KidHome 三个入口）
  - 数学 10 单元 + 语文 7 单元全部渲染
  - 节点状态 class 与 seed 一致（mastered/learning/weak/not_started/locked 五色）
  - 点击节点展开「掌握度/练习数/错题数」详情卡
"""
import sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:5173"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(extra)) if extra else ""))
    if not cond:
        raise AssertionError(name)


def test_wide_map(page):
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(BASE + "/#/kid/today")
    page.wait_for_selector(".tt-xp-section", timeout=15000)
    # 阳性对照：v5 既有特性必须在（防止空白页把所有计数读成通过）
    check("wide: 阳性对照 今日进度 在 (v5既有)", "今日进度" in page.content())

    page.click("[data-testid=kg-entry-sidebar]")
    page.wait_for_selector(".kg-page", timeout=10000)
    check("wide: 侧栏入口跳到 #/map", "#/map" in page.url)
    check("wide: 地图标题渲染", page.locator(".kg-title").inner_text().find("冒险地图") >= 0)

    # 默认语文：7 个单元
    page.wait_for_selector(".kg-branch", timeout=10000)
    cn_units = page.locator(".kg-branch > .kg-node").count()
    check("wide: 语文 7 单元渲染", cn_units == 7, f"got {cn_units}")

    # 五种状态色全部出现（语文：mastered/learning/weak/not_started/locked 各至少 1）
    statuses = ["is-mastered", "is-learning", "is-weak", "is-not_started", "is-locked"]
    for s in statuses:
        n = page.locator(f".kg-branch > .kg-node.{s}").count()
        check(f"wide: 语文含状态 {s}", n >= 1, f"count {n}")

    # 点击拼音 → 详情卡三指标（数值来自 v1 文档：掌握度60% 练习12次 错题3题）
    page.click(".kg-node:has-text('拼音')")
    detail = page.locator(".kg-branch > .kg-detail").first
    expect(detail).to_be_visible(timeout=5000)
    txt = detail.inner_text()
    for label in ["掌握度", "练习数", "错题数"]:
        check(f"wide: 详情含 {label}", label in txt, txt.replace("\n", " | "))
    check("wide: 拼音掌握度=60% (文档值)", "60%" in txt)
    check("wide: 拼音练习数=12次 (文档值)", "12次" in txt)
    check("wide: 拼音错题数=3题 (文档值)", "3题" in txt)

    # 子节点树：拼音下声母23个/韵母24个
    check("wide: 拼音子节点 声母23个", page.locator(".kg-kid:has-text('声母23个')").count() == 1)
    check("wide: 拼音子节点 韵母24个=薄弱", page.locator(".kg-kid.is-weak:has-text('韵母24个')").count() == 1)
    page.click(".kg-kid:has-text('韵母24个')")
    kid_detail = page.locator(".kg-detail--kid").first
    expect(kid_detail).to_be_visible(timeout=5000)
    check("wide: 子节点详情 掌握度=50% (文档值)", "50%" in kid_detail.inner_text())

    # 切数学 tab：10 单元 + 状态映射 + 空数值显示"待维护"（不编数）
    page.click(".kg-tab:has-text('数学')")
    page.wait_for_selector(".kg-branch", timeout=5000)
    math_units = page.locator(".kg-branch > .kg-node").count()
    check("wide: 数学 10 单元渲染", math_units == 10, f"got {math_units}")
    for name, st in [("数一数", "is-mastered"), ("认识10以内", "is-learning"), ("分与合", "is-weak"),
                     ("10以内加减", "is-not_started"), ("认识11-20", "is-locked")]:
        check(f"wide: 数学[{name}] → {st}", page.locator(f".kg-branch > .kg-node.{st}:has-text('{name}')").count() == 1)
    check("wide: 数学末单元 20以内进位加=locked",
          page.locator(".kg-branch > .kg-node.is-locked:has-text('20以内进位加')").count() == 1)

    page.click(".kg-branch > .kg-node:has-text('分与合')")
    mtxt = page.locator(".kg-branch > .kg-detail").first.inner_text()
    check("wide: 数学详情三指标", all(k in mtxt for k in ["掌握度", "练习数", "错题数"]), mtxt.replace("\n", " | "))
    check("wide: 无数值节点显示待维护（不编造）", "待维护" in mtxt)

    # 阳性对照：数学 tab 高亮
    check("wide: 阳性对照 数学tab激活", "is-on" in (page.locator(".kg-tab:has-text('数学')").get_attribute("class") or ""))


def test_narrow_tab(page):
    page.set_viewport_size({"width": 375, "height": 700})
    page.goto(BASE + "/#/kid/today")
    page.wait_for_selector(".tt-tabs", timeout=15000)
    check("narrow: 阳性对照 底tab 冒险 在 (v5既有)", page.locator(".tt-tab:has-text('冒险')").count() >= 1)
    check("narrow: 地图入口 tab 存在", page.locator("[data-testid=kg-entry-tab]").count() == 1)
    page.click("[data-testid=kg-entry-tab]")
    page.wait_for_selector(".kg-branch", timeout=10000)
    check("narrow: 底tab 跳到 #/map 且渲染", "#/map" in page.url and page.locator(".kg-branch").count() >= 7)


def test_kidhome_entry(page):
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(BASE + "/#/kid")
    page.wait_for_selector(".kid-title", timeout=15000)
    check("kidhome: 阳性对照 今天要做的事 (v5既有)", "今天要做的事" in page.content())
    check("kidhome: 冒险地图入口存在", page.locator("[data-testid=kg-entry-kidhome]").count() == 1)
    page.click("[data-testid=kg-entry-kidhome]")
    page.wait_for_selector(".kg-branch", timeout=10000)
    check("kidhome: 入口跳到 #/map", "#/map" in page.url)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            test_wide_map(page)
            test_narrow_tab(page)
            test_kidhome_entry(page)
        finally:
            browser.close()
    check("全程无未捕获页面 JS 错误", not errors, errors[:3])
    fails = [n for n, ok in results if not ok]
    print(f"\n=== E2E P1 done: {len(results)} checks, {len(fails)} failed ===")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
