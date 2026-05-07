FastAPI decides body vs query vs dependency *before* handling a request, then resolves them in distinct phases at request time.

- **Route/request-handler setup**
  - `fastapi/routing.py` builds the handler in `get_request_handler(...)`.
  - That handler relies on dependency/signature analysis from `get_dependant(...)` and related helpers.
  - The parameter classification logic lives in `fastapi/dependencies/utils.py`, especially:
    - `get_dependant(...)`
    - `analyze_param(...)`
    - `add_param_to_fields(...)`
    - `add_non_field_param_to_dependency(...)`

Those helpers populate a `Dependant` with separate buckets:
- `dependant.dependencies` for `Depends(...)`
- `dependant.query_params`, `path_params`, `header_params`, `cookie_params`
- `dependant.body_params`

At request time, the flow is:

1. **Parse the request body if needed**
   - In `fastapi/routing.py`, `get_request_handler(...)` reads/parses the incoming body from the `Request`.

2. **Resolve everything through `solve_dependencies(...)`**
   - Main implementation: `fastapi/dependencies/utils.py` → `solve_dependencies(...)`

   Inside `solve_dependencies(...)`, resolution is effectively:

   - **Dependency-injected values first**
     - Iterates `dependant.dependencies`
     - Recursively calls `solve_dependencies(...)`
     - Inserts dependency return values into the final `values` dict under the dependency name

   - **Non-body request params**
     - Path: `request_params_to_args(dependant.path_params, request.path_params)`
     - Query: `request_params_to_args(dependant.query_params, request.query_params)`
     - Header: `request_params_to_args(dependant.header_params, request.headers)`
     - Cookie: `request_params_to_args(dependant.cookie_params, request.cookies)`

   - **Body params**
     - If `dependant.body_params` is non-empty, calls:
       - `request_body_to_args(body_fields=dependant.body_params, received_body=body, embed_body_fields=embed_body_fields)`

   - **Special framework-injected values**
     - Also injects values like `Request`, `WebSocket`, `BackgroundTasks`, `Response`, and `SecurityScopes`

3. **Call the endpoint**
   - `fastapi/routing.py`’s `get_request_handler(...)` invokes the endpoint with the merged `values` dict.

So when one endpoint mixes all three:
- **dependencies** come from recursive dependency solving in `solve_dependencies(...)`
- **query params** come from `request.query_params` via `request_params_to_args(...)`
- **body params** come from the parsed request body via `request_body_to_args(...)`

There is no runtime guessing or precedence conflict between body vs query vs dependency: the split is determined up front by `get_dependant(...)` / `analyze_param(...)`, then `solve_dependencies(...)` fills the final argument dict from those categorized groups.

Related OpenAPI code:
- `fastapi/openapi/utils.py`
  - `get_openapi_operation_parameters(...)`
  - request-body generation logic in the same file
  - It uses the same categorized `Dependant` fields to emit query/path/header/cookie entries as OpenAPI `parameters` and body fields as `requestBody`.
