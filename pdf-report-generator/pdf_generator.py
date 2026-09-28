import os
from datetime import datetime
from playwright.async_api import async_playwright


async def generate_pdf(report_id: str, data: dict) -> str:
    """Stage 3: Renders HTML into a PDF using Headless Chromium[cite: 3]."""
    os.makedirs("reports", exist_ok=True)
    pdf_path = f"reports/{report_id}.pdf"
    today = datetime.utcnow().strftime('%Y-%m-%d')

    # HTML Template with print CSS to prevent page break slicing[cite: 3]
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            h1 {{ color: #333; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f4f4f4; }}
            /* The Print CSS Trap Fixes[cite: 3] */
            tr {{ break-inside: avoid; }}
            thead {{ display: table-header-group; }}
        </style>
    </head>
    <body>
        <h1>Daily Sales Report - {today}</h1>
        <h2>Summary</h2>
        <p>Total Orders: <strong>{data['count']}</strong></p>
        <p>Total Revenue: <strong>${data['revenue']:,.2f}</strong></p>

        <h2>Top 5 Products</h2>
        <table>
            <thead><tr><th>Product</th><th>Revenue</th></tr></thead>
            <tbody>
                {''.join(f"<tr><td>{p['product']}</td><td>${p['revenue']:,.2f}</td></tr>" for p in data['top_products'])}
            </tbody>
        </table>

        <h2>All Orders (Demonstrating Page Breaks)</h2>
        <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
                {''.join(f"<tr><td>{o['id']}</td><td>{o['customer']}</td><td>{o['product']}</td><td>${o['amount']:,.2f}</td><td>{o['created_at']}</td></tr>" for o in data['all_orders'])}
            </tbody>
        </table>
    </body>
    </html>
    """

    # Launch Chromium and print[cite: 3]
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_content(html_content)
        await page.pdf(path=pdf_path, format="A4", print_background=True)
        await browser.close()

    return pdf_path