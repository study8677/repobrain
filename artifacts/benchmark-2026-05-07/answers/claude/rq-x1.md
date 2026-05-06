**Answer:** End-to-end path for `requests.get(url)`:

1. **Module helper** — `api.py:74-87`: `get()` → `request("get", url, ...)` which spins up a temporary `Session` via `with sessions.Session() as session:`.
2. **`Session.request`** (sessions.py:557-653): builds a `Request`, then `prepare_request()` to a `PreparedRequest`, then `send()`.
3. **`Session.prepare_request`** (sessions.py:511-540): merges Session-level cookies/auth/headers/proxies/hooks into the request, calls `PreparedRequest().prepare(...)`.
4. **`PreparedRequest.prepare`** (models.py:422-449): runs `prepare_method`, `prepare_url`, `prepare_headers`, `prepare_cookies`, `prepare_body`, `prepare_auth`, `prepare_hooks`.
5. **`Session.send`** (sessions.py:745-822): `get_adapter(url)` picks the mounted `HTTPAdapter`, then `adapter.send(req, **kwargs)`. Hooks and `resolve_redirects` run around the result.
6. **`HTTPAdapter.send`** (adapters.py:636-750): `get_connection_with_tls_context()` → urllib3 pool, then `conn.urlopen(method, url, body, headers, …)` (lines 698-710), translating urllib3 exceptions and wrapping the urllib3 response into `requests.Response` via `build_response`.
7. **Socket I/O**: urllib3's `HTTPConnectionPool.urlopen` opens/reuses a connection, performs the actual TCP/TLS handshake and HTTP roundtrip.

**Citations:**
- src/requests/api.py:87 (request dispatch)
- src/requests/sessions.py:540-541, 557-653, 745-822 (Session lifecycle)
- src/requests/models.py:422-449 (PreparedRequest.prepare)
- src/requests/adapters.py:636-750 (HTTPAdapter.send)
- src/requests/adapters.py:698-710 (urlopen call)

**Confidence:** High
