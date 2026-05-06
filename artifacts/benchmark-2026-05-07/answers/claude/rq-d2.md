**Answer:** Three layers cooperate.

- **`verify=` parameter**: accepts `True` (default), `False`, or a path to a CA bundle file/dir. In `_urllib3_request_context` (adapters.py:97-105) it's translated to urllib3's `cert_reqs="CERT_REQUIRED"` / `"CERT_NONE"`, plus `ca_certs` / `ca_cert_dir`.
- **Default CA bundle**: `DEFAULT_CA_BUNDLE_PATH` (utils.py:82) is sourced from `requests.certs.where()`, which is a thin re-export of `certifi.where()` (certs.py:15). `Session.merge_environment_settings` (sessions.py:848-853) lets `REQUESTS_CA_BUNDLE` and `CURL_CA_BUNDLE` env vars override it.
- **Bundle validation**: the adapter raises `OSError` when the bundle path doesn't exist (adapters.py:331-335).

So precedence is: explicit `verify=` → env vars → certifi default; `verify=False` short-circuits the chain and turns off verification entirely.

**Citations:**
- src/requests/certs.py:15 (certifi reexport)
- src/requests/adapters.py:97-105 (cert_reqs translation)
- src/requests/adapters.py:331-335 (validation)
- src/requests/sessions.py:469-478 (default verify)
- src/requests/sessions.py:848-853 (env overrides)
- src/requests/utils.py:82 (DEFAULT_CA_BUNDLE_PATH)

**Confidence:** High
