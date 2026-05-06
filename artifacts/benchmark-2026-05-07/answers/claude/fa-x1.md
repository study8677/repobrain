**Answer:**

1. `solve_dependencies` (fastapi/dependencies/utils.py:721) creates `BackgroundTasks()` when an endpoint declares the parameter and inserts it into resolved values.
2. The route handler attaches it to the response: regular responses receive it via `response_args["background"]` (routing.py:337); streaming responses get `background=solved_result.background_tasks` directly (routing.py:614, 650); user-returned Response objects get `raw_response.background = solved_result.background_tasks` (routing.py:681).
3. The route's outer ASGI callable does `await response(scope, receive, send)` (routing.py:121). Since FastAPI's `BackgroundTasks` subclasses `StarletteBackgroundTasks` (background.py:11), Starlette's `Response.__call__` runs the body, then iterates the registered tasks (await async funcs / run sync via `run_in_threadpool`) before completing the ASGI cycle.

**Citations:**
- fastapi/dependencies/utils.py:721 (instantiation)
- fastapi/routing.py:337, 614, 650, 681 (attach)
- fastapi/routing.py:121 (ASGI dispatch)
- fastapi/background.py:11 (subclass Starlette)

**Confidence:** High
