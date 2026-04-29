import asyncio, json, os, re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "https://companionscpas-platform.samprimeauxwork.workers.dev"
OUT = Path("qa/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("/", "home"),
    ("/about", "about"),
    ("/adopt", "adopt"),
    ("/services", "services"),
    ("/donate", "donate"),
    ("/admin/login", "admin-login"),
    ("/admin/dashboard", "admin-dashboard"),
    ("/admin/dashboard/cms", "admin-dashboard-cms"),
]

REQUIRED_TEXT = {
    "/": ["Companions", "CPAS"],
    "/about": ["Companions", "CPAS"],
    "/adopt": ["Companions", "CPAS"],
    "/services": ["Companions", "CPAS"],
    "/donate": ["Companions", "CPAS"],
}

EIN = "88-4156327"

async def main():
    failures = []
    report = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 1200}, device_scale_factor=1)

        for path, name in PAGES:
            url = BASE + path
            print(f"Auditing {url}")
            try:
                res = await page.goto(url, wait_until="networkidle", timeout=45000)
                status = res.status if res else 0

                html = await page.content()
                title = await page.title()
                scroll_height = await page.evaluate("document.documentElement.scrollHeight")
                fonts = await page.evaluate("""
                    [...new Set([...document.querySelectorAll('*')]
                    .map(el => getComputedStyle(el).fontFamily)
                    .filter(Boolean))].slice(0, 20)
                """)
                bg = await page.evaluate("getComputedStyle(document.body).background")
                color = await page.evaluate("getComputedStyle(document.body).color")

                screenshot = OUT / f"{name}.png"
                await page.screenshot(path=str(screenshot), full_page=True)

                page_failures = []

                if status >= 400:
                    page_failures.append(f"HTTP status {status}")

                for text in REQUIRED_TEXT.get(path, []):
                    if text.lower() not in html.lower():
                        page_failures.append(f"Missing required text: {text}")

                if path in ["/", "/about", "/donate"] and EIN not in html:
                    page_failures.append(f"Missing EIN {EIN}")

                if path in ["/", "/about", "/adopt", "/services", "/donate"] and scroll_height < 1800:
                    page_failures.append(f"Poor storytelling / too short: scrollHeight={scroll_height}")

                popup_terms = ["modal", "popup", "donation", "application", "form", "stripe", "resend"]
                popup_score = sum(1 for term in popup_terms if term in html.lower())

                if path in ["/adopt", "/donate"] and popup_score < 3:
                    page_failures.append("Weak popup/form/payment/email readiness signals")

                if len(fonts) > 8:
                    page_failures.append(f"Theme/font inconsistency risk: {len(fonts)} font families detected")

                report.append({
                    "url": url,
                    "status": status,
                    "title": title,
                    "scroll_height": scroll_height,
                    "fonts": fonts,
                    "body_background": bg,
                    "body_color": color,
                    "screenshot": str(screenshot),
                    "failures": page_failures,
                })

                failures.extend([f"{path}: {x}" for x in page_failures])

            except Exception as e:
                failures.append(f"{path}: audit crashed: {e}")
                report.append({"url": url, "failures": [str(e)]})

        await browser.close()

    Path("qa/quality-test-1-report.json").write_text(json.dumps(report, indent=2))

    print("\n=== QUALITY TEST 1 REPORT ===")
    print(json.dumps(report, indent=2))

    if failures:
        print("\n=== HARD FAIL ===")
        for f in failures:
            print(" -", f)
        raise SystemExit(1)

    print("\nPASS: Quality Test 1 passed.")

if __name__ == "__main__":
    asyncio.run(main())
