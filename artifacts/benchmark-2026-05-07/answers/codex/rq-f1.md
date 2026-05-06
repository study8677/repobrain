Answer: `Session` is defined in `src/requests/sessions.py` as `class Session(SessionRedirectMixin):`.
It imports `HTTPAdapter` from `.adapters`.
In `Session.__init__`, it mounts `HTTPAdapter()` for both `"https://"` and `"http://"`.
So the default HTTP adapter is `requests.adapters.HTTPAdapter`.
Citations: src/requests/sessions.py:21, src/requests/sessions.py:395, src/requests/sessions.py:502, src/requests/sessions.py:503
Confidence: High