# AuditGrade Python Engine

This folder contains the standalone Python implementation of the financial engine.
As a data scientist, you can use this script to validate your models or run the accounting logic locally.

## Files
* `backend/audit_grade_engine.py` - The core logic.

## How to Run

1. Ensure you have Python 3.7+ installed.
2. No external libraries are required (uses standard `decimal`, `dataclasses`).
3. Run the script:

```bash
python backend/audit_grade_engine.py
```

## Key Features
* **Decimal Precision**: Uses 28-point precision for all calculations.
* **Bank Rounding**: Implements `ROUND_HALF_UP` to match standard financial reporting.
* **Audit Trail**: The engine prints a line-by-line ledger of how state changes after every transaction.

## Modifying Logic
Search for the `AuditEngine` class in the python file. You can adjust:
* `calculate_average_cost`: Change how average cost is derived.
* `Transaction.create_buy/sell`: Change how fees or totals are calculated.
