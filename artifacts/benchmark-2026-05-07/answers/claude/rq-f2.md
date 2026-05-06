**Answer:** Redirects are resolved by `Session.resolve_redirects()` in `src/requests/sessions.py:186`. It iterates redirect responses, rebuilds each request, and stops when `len(resp.history) >= self.max_redirects` (line 216), raising `TooManyRedirects`. The default limit is `DEFAULT_REDIRECT_LIMIT = 30`, defined in `src/requests/models.py:104` and assigned in `Session.__init__` at line 488 (`self.max_redirects = DEFAULT_REDIRECT_LIMIT`).

**Citations:**
- src/requests/sessions.py:186 (resolve_redirects)
- src/requests/sessions.py:216 (limit check)
- src/requests/sessions.py:488 (max_redirects default)
- src/requests/models.py:104 (DEFAULT_REDIRECT_LIMIT = 30)

**Confidence:** High
