**Answer:** The `Session` class is defined in `src/requests/sessions.py:395`. In its `__init__` (lines 502-503) it mounts an `HTTPAdapter` for both `https://` and `http://` schemes by default. `HTTPAdapter` itself lives at `src/requests/adapters.py:158`.

**Citations:**
- src/requests/sessions.py:395 (Session class)
- src/requests/sessions.py:502-503 (default mounts)
- src/requests/adapters.py:158 (HTTPAdapter)

**Confidence:** High
