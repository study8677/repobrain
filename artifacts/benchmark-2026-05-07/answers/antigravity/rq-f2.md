Redirect resolution in `requests` is handled by `SessionRedirectMixin.resolve_redirects` in `src/requests/sessions.py`. Redirect responses are identified via the `Response.is_redirect` and `Response.is_permanent_redirect` properties in `src/requests/models.py`.

The maximum default redirect limit is `DEFAULT_REDIRECT_LIMIT = 30` (referenced in both `src/requests/models.py` and `src/requests/sessions.py`).
