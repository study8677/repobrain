User-defined background tasks are executed by **Starlette**, after FastAPI has collected them during dependency resolution and attached them to the response.

Trace the path:

1. **User-facing `BackgroundTasks` type**
   - Defined as a thin subclass of Starlette’s background task container:
     - `fastapi/datastructures.py` → `class BackgroundTasks(StarletteBackgroundTasks)`
     - also noted in `fastapi/background.py` → `class BackgroundTasks(StarletteBackgroundTasks)`
   - `add_task()` does not execute anything itself; it just delegates:
     - `def add_task(self, func, *args, **kwargs) -> None: return super().add_task(func, *args, **kwargs)`

2. **Created/injected during dependency solving**
   - In `fastapi/dependencies/utils.py`, inside `solve_dependencies(...)`, FastAPI creates or reuses the container:
     - `if background_tasks is None: background_tasks = BackgroundTasks()`
   - If the endpoint/dependency has a background-tasks parameter, it is injected into the call values:
     - `if dependant.background_tasks_param_name: values[dependant.background_tasks_param_name] = background_tasks`
   - The `SolvedDependency` returned by `solve_dependencies(...)` includes:
     - `background_tasks=background_tasks`

3. **Routing layer pulls it from solved dependencies**
   - In `fastapi/routing.py`, inside `get_request_handler(...)`, FastAPI does:
     - `solved_result = await solve_dependencies(...)`
     - then extracts:
       - `background_tasks = solved_result.background_tasks`

4. **Attached to the response**
   - Still in `fastapi/routing.py` / `get_request_handler(...)`:
     - if the endpoint returned a `Response` directly:
       - `raw_response.background = solved_result.background_tasks`
     - otherwise, when FastAPI builds the response itself, it passes:
       - `background=solved_result.background_tasks`

5. **Actual execution happens after the response is sent**
   - FastAPI does **not** run the tasks itself in these files.
   - FastAPI response classes in `fastapi/responses.py` are Starlette responses, e.g.:
     - `from starlette.responses import Response as Response`
   - So once the `BackgroundTasks` object is attached to `Response.background`, Starlette’s response/background machinery sends the response body and then runs the background callable(s).

So the end-to-end path is:

**user `BackgroundTasks.add_task(...)`**
→ `fastapi/datastructures.py` / `fastapi/background.py` wrapper over `StarletteBackgroundTasks`
→ `fastapi/dependencies/utils.py:solve_dependencies(...)` creates/injects/carries it
→ returned as `SolvedDependency.background_tasks`
→ `fastapi/routing.py:get_request_handler(...)` attaches it to `Response.background`
→ Starlette `Response` executes it post-send.

Relevant files/functions:
- `fastapi/datastructures.py`
- `fastapi/background.py`
- `fastapi/dependencies/utils.py`
  - `solve_dependencies`
- `fastapi/routing.py`
  - `get_request_handler`
- `fastapi/responses.py`

No separate FastAPI background runner is involved here; execution is delegated to Starlette.
