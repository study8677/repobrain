Answer: Redirect resolution is handled by `SessionRedirectMixin.resolve_redirects(...)`.
It is called by `Session.send` when redirects are allowed.
The default maximum is 30 redirects: `DEFAULT_REDIRECT_LIMIT: int = 30`.
`Session.__init__` assigns it to `self.max_redirects`, and the resolver raises `TooManyRedirects` at the limit.
Citations: src/requests/sessions.py:186, src/requests/sessions.py:794, src/requests/sessions.py:797, src/requests/sessions.py:216, src/requests/sessions.py:488, src/requests/models.py:104
Confidence: High