`Session` is defined in `src/requests/sessions.py` as the `Session` class.

By default, in `Session.__init__`, it mounts `HTTPAdapter()` for both:
- `"https://"`
- `"http://"`

So the default adapter is `requests.adapters.HTTPAdapter`, mounted on both HTTP and HTTPS prefixes.
