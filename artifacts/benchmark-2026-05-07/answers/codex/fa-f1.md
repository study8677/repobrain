Answer: `Depends` is defined in [fastapi/params.py](/tmp/ag-bench/fastapi/fastapi/params.py:746) as a frozen dataclass: `class Depends:`.
Answer: Its generated `__init__` accepts `dependency=None`, `use_cache=True`, and `scope=None`.
Answer: Types are `Callable[..., Any] | None`, `bool`, and `Literal["function", "request"] | None`.
Answer: The public `fastapi.Depends` function returns `params.Depends(...)` with those same three arguments.
Citations: fastapi/params.py:745, fastapi/params.py:746, fastapi/params.py:747, fastapi/params.py:748, fastapi/params.py:749, fastapi/param_functions.py:2283, fastapi/param_functions.py:2369
Confidence: High