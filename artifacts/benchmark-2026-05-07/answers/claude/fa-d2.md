**Answer:** Per-route, FastAPI caches `dependant.is_coroutine_callable` (a `cached_property` in `dependencies/models.py:158-185`). It uses `iscoroutinefunction()` after unwrapping, so it handles plain async defs and async `__call__` instances alike.

At dispatch time, `routing.py:370` reads that flag and passes it into `run_endpoint_function` (call site at 674-678). Inside `run_endpoint_function` (lines 320-330):
- if `is_coroutine` is True → `return await dependant.call(**values)`
- else → `return await run_in_threadpool(dependant.call, **values)`

So sync endpoints are off-loaded to Starlette's threadpool while coroutines are awaited inline.

**Citations:**
- fastapi/dependencies/models.py:158-185 (is_coroutine_callable)
- fastapi/routing.py:320-330 (run_endpoint_function)
- fastapi/routing.py:370 (read flag)
- fastapi/routing.py:674-678 (call site)

**Confidence:** High
