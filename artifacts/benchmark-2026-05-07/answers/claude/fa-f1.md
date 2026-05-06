**Answer:** The `Depends` class is defined in `fastapi/fastapi/params.py` at line 746. It is a frozen dataclass (not a traditional `__init__`) with three attributes: `dependency` (a callable or None), `use_cache` (bool, default True), and `scope` (Literal option or None).

**Citations:** fastapi/params.py:745-749

**Confidence:** High
