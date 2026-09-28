import sqlite3
import random
from datetime import datetime, timedelta

DB_FILE = "report.db"


def get_db():
    """Returns a dictionary-like cursor for SQLite."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def setup_and_seed():
    """Stage 1: Idempotent seeder. Deletes existing data and inserts 200 random orders."""
    conn = get_db()
    c = conn.cursor()

    # Create tables
    c.execute("""
              CREATE TABLE IF NOT EXISTS orders
              (
                  id
                  INTEGER
                  PRIMARY
                  KEY
                  AUTOINCREMENT,
                  customer
                  TEXT,
                  product
                  TEXT,
                  amount
                  REAL,
                  created_at
                  DATE
              )
              """)
    c.execute("""
              CREATE TABLE IF NOT EXISTS reports
              (
                  id
                  TEXT
                  PRIMARY
                  KEY,
                  path
                  TEXT,
                  created_at
                  DATE
              )
              """)

    # Idempotent reset
    c.execute("DELETE FROM orders")

    products = ["Widget A", "Widget B", "Super SaaS", "Cloud Credits", "Consulting", "Support Ticket"]

    # Insert 200 rows
    for _ in range(200):
        product = random.choice(products)
        amount = round(random.uniform(5.0, 200.0), 2)
        # Random date in the last 30 days
        days_ago = random.randint(0, 30)
        date_str = (datetime.utcnow() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        c.execute("INSERT INTO orders (customer, product, amount, created_at) VALUES (?, ?, ?, ?)",
                  (f"Customer_{random.randint(1, 100)}", product, amount, date_str))

    conn.commit()
    conn.close()
    print("Database seeded with exactly 200 orders.")


def get_report_data() -> dict:
    """Stage 2: SQL Aggregation[cite: 3]."""
    conn = get_db()
    c = conn.cursor()

    # Total orders & revenue[cite: 3]
    totals = c.execute("SELECT COUNT(*) as count, SUM(amount) as revenue FROM orders").fetchone()

    # Top 5 products[cite: 3]
    top_products = c.execute("""
                             SELECT product, SUM(amount) as revenue
                             FROM orders
                             GROUP BY product
                             ORDER BY revenue DESC LIMIT 5
                             """).fetchall()

    # Last 7 days orders[cite: 3]
    recent_orders = c.execute("""
                              SELECT created_at, COUNT(*) as count
                              FROM orders
                              WHERE created_at >= date ('now', '-7 days')
                              GROUP BY created_at
                              ORDER BY created_at
                              """).fetchall()

    # Raw rows for the long table[cite: 3]
    all_orders = c.execute("SELECT * FROM orders ORDER BY created_at DESC").fetchall()

    conn.close()
    return {
        "count": totals["count"],
        "revenue": totals["revenue"],
        "top_products": [dict(row) for row in top_products],
        "recent_orders": [dict(row) for row in recent_orders],
        "all_orders": [dict(row) for row in all_orders]
    }