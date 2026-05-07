In `fastapi/routing.py`, FastAPI makes this decision when building the request handler for a path operation.

Specifically:

- In `get_request_handler(...)`, FastAPI computes:
  - `is_coroutine = asyncio.iscoroutinefunction(dependant.call)`

- That `is_coroutine` flag is then passed into `run_endpoint_function(...)`.

- In `run_endpoint_function(...)`, the actual branching happens:
  - if `is_coroutine` is true, FastAPI does:
    - `return await dependant.call(**values)`
  - otherwise it runs the sync endpoint in a threadpool:
    - `return await run_in_threadpool(dependant.call, **values)`

So the decision is made in `fastapi/routing.py`, with:
- detection in `get_request_handler(...)`
- execution choice in `run_endpoint_function(...)`
