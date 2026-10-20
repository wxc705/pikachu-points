"""E1/E2 E2E：家长端「云同步密钥」状态入口 + 顶栏「设置」文字可认。

跑法（dev server 必须带 GitHub 引擎，设置页才会渲染密钥区块）：
  VITE_SYNC_ENGINE=github VITE_GH_REPO=wxc705/pikachu-data \
    npm run dev -- --host 127.0.0.1 --port 5173
  python scripts/e2e-settings-entry.py

可选环境变量：BASE（默认 http://127.0.0.1:5173）。

断言：
  1. 手机视口 390x844，未置 token：顶部出现「未录入」提示条 + ≥44px 可点按钮；
     顶栏「设置」带可见文字 / title / aria-label（E2）。
  2. 点「去设置粘贴」→ #/settings，密钥输入框在。
  3. 保存假 token → 浏览器后退回 #/parent（同一 document，不整页刷新）→ 提示条变「已录入」。
  4. #/kid、#/kid/today 无未捕获 JS 错误，儿童端顶栏（header）仍被隐藏。
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:5173").rstrip("/")
FAKE_TOKEN = "fake-e2e-token-not-real-123456"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(extra)) if extra else ""))
    if not cond:
        raise AssertionError(name)


def visible_link_count(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('header nav a')]
          .filter((a) => a.getClientRects().length > 0
                     && getComputedStyle(a).visibility !== 'hidden'
                     && getComputedStyle(a).display !== 'none').length"""
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="zh-CN",
        )
        page = ctx.new_page()
        page_errors = []
        console_errors = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )

        # ---------- 1. 未录入：提示条 + 可点按钮（手机 390x844） ----------
        page.goto(BASE + "/#/parent", wait_until="domcontentloaded")
        page.wait_for_selector("[data-testid=gh-token-banner]", timeout=20000)
        check(
            "1a 未置 token：初始 localStorage 为空（新 context）",
            not page.evaluate("() => localStorage.getItem('pk_gh_token')"),
        )
        banner = page.locator("[data-testid=gh-token-banner]")
        check(
            "1b 未录入提示条在页面顶部（state=missing）",
            banner.get_attribute("data-gh-token-state") == "missing",
            banner.get_attribute("data-gh-token-state"),
        )
        banner_text = banner.inner_text()
        check("1c 提示文案含「云同步密钥未录入」", "云同步密钥未录入" in banner_text, banner_text[:80])
        cta = page.locator("[data-testid=gh-token-cta]")
        box = cta.bounding_box()
        check(
            "1d 「去设置粘贴」可见且点按高度 >= 44px",
            cta.is_visible() and box is not None and box["height"] >= 44,
            box,
        )
        check("1e 按钮文案 = 去设置粘贴", "去设置粘贴" in cta.inner_text(), cta.inner_text())

        # E2：手机顶栏「设置」肉眼可认（文字 + title + aria-label）
        nav_settings = page.locator("header nav a[title='设置']")
        check(
            "1f E2 顶栏「设置」链接可见且渲染文字",
            nav_settings.count() == 1
            and nav_settings.is_visible()
            and "设置" in nav_settings.inner_text(),
            nav_settings.inner_text() if nav_settings.count() else "not found",
        )
        check(
            "1g E2 顶栏「设置」带 title/aria-label",
            nav_settings.get_attribute("aria-label") == "设置"
            and nav_settings.get_attribute("title") == "设置",
            {
                "title": nav_settings.get_attribute("title"),
                "aria": nav_settings.get_attribute("aria-label"),
            },
        )
        settings_box = nav_settings.bounding_box()
        check(
            "1h E2 手机 390px 下「设置」在视口内（无需横向滚动才能看到）",
            settings_box is not None
            and settings_box["x"] >= 0
            and settings_box["x"] + settings_box["width"] <= 390,
            settings_box,
        )

        # ---------- 2. 点入口 → 设置页 + 密钥输入框 ----------
        cta.click()
        page.wait_for_function("() => location.hash === '#/settings'", timeout=10000)
        page.wait_for_selector("#gh-token-input", state="visible", timeout=20000)
        check(
            "2a 「去设置粘贴」→ #/settings",
            page.evaluate("() => location.hash") == "#/settings",
            page.evaluate("() => location.hash"),
        )
        check(
            "2b 设置页密钥输入框在且为 password",
            page.locator("#gh-token-input").is_visible()
            and page.locator("#gh-token-input").get_attribute("type") == "password",
        )

        # ---------- 3. 保存假 token → 后退回父页 → 提示条变已录入 ----------
        page.fill("#gh-token-input", FAKE_TOKEN)
        page.click("[data-testid=gh-token-save]")
        page.wait_for_function(
            "(v) => localStorage.getItem('pk_gh_token') === v", arg=FAKE_TOKEN, timeout=10000
        )
        # 打标记：后退若触发整页刷新，window 上的标记会丢；用它证明是 SPA 内返回后重读
        page.evaluate("() => { window.__e1SameDocument = true }")
        page.evaluate("() => history.back()")
        page.wait_for_function("() => location.hash === '#/parent'", timeout=10000)
        page.wait_for_selector(
            "[data-testid=gh-token-banner][data-gh-token-state=saved]", timeout=20000
        )
        saved_banner = page.locator("[data-testid=gh-token-banner]")
        saved_text = saved_banner.inner_text()
        check(
            "3a 返回 #/parent 后提示条变「已录入」",
            saved_banner.get_attribute("data-gh-token-state") == "saved"
            and "云同步密钥已录入" in saved_text,
            saved_text[:80],
        )
        check(
            "3b 已录入时「管理」链接可见",
            page.locator("[data-testid=gh-token-manage]").is_visible(),
        )
        check(
            "3c 返回父页未整页刷新（同一 document，SPA 路由返回后重读 localStorage）",
            page.evaluate("() => window.__e1SameDocument === true"),
        )

        # ---------- 4. 儿童端回归：无 JS 错误 + 顶栏仍隐藏 ----------
        page.goto(BASE + "/#/kid", wait_until="domcontentloaded")
        page.wait_for_selector(".kid-page", timeout=20000)
        page.wait_for_function("() => document.body.classList.contains('kid-mode')", timeout=10000)
        page.wait_for_timeout(300)
        check("4a /kid 渲染 KidHome 主屏", page.locator(".kid-page").is_visible())
        check(
            "4b /kid 顶栏 header 仍被隐藏（儿童端 UI 未被 E2 弄脏）",
            not page.locator("header:not(.hero)").is_visible() and visible_link_count(page) == 0,
            {"header_visible": page.locator("header:not(.hero)").is_visible(), "nav_visible": visible_link_count(page)},
        )

        page.goto(BASE + "/#/kid/today", wait_until="domcontentloaded")
        page.wait_for_selector(".tt-page", timeout=20000)
        page.wait_for_function("() => document.body.classList.contains('kid-mode')", timeout=10000)
        page.wait_for_timeout(300)
        check("4c /kid/today 渲染今日视图", page.locator(".tt-page").is_visible())
        check(
            "4d /kid/today 顶栏 header 仍被隐藏",
            not page.locator("header:not(.hero)").is_visible() and visible_link_count(page) == 0,
            {"header_visible": page.locator("header:not(.hero)").is_visible(), "nav_visible": visible_link_count(page)},
        )
        check(
            "4e /kid 与 /kid/today 全程无未捕获 JS 错误",
            not page_errors,
            page_errors[:3],
        )
        if console_errors:
            print("INFO console errors (非断言项，多为 dev 素材 404):", console_errors[:3])

        browser.close()

    fails = [n for n, ok in results if not ok]
    print(f"\n=== E2E settings-entry done: {len(results)} checks, {len(fails)} failed ===")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
