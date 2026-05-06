**Answer:** Resolution happens in two phases.

1. **Compile-time classification (`get_dependant` / `analyze_param`)**: When a route is registered, each parameter's annotation is inspected. Depends sentinels become sub-dependencies; other params are routed into path/query/header/cookie via `add_param_to_fields`, with body params kept separate.

2. **Request-time (`solve_dependencies`)**: Sub-dependencies are recursively solved first (their own params resolved the same way), then path/query/header/cookie are pulled from the Starlette `Request`, body params parsed, and special injections (Request, Response, BackgroundTasks, SecurityScopes) inserted directly.

For an endpoint that mixes all three, the Depends() values are computed first and cached, then non-dependency params are filled from path → query → header → cookie → body, with later sources overriding earlier ones on name conflicts.

**Citations:**
- fastapi/dependencies/utils.py:286-359 (get_dependant)
- fastapi/dependencies/utils.py:393-435 (analyze_param)
- fastapi/dependencies/utils.py:562-575 (add_param_to_fields)
- fastapi/dependencies/utils.py:598-735 (solve_dependencies)
- fastapi/params.py:19-24 (ParamTypes)

**Confidence:** High
