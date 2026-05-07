`requests` handles SSL/TLS verification through `HTTPAdapter`, with the default CA bundle coming from `certifi`.

- In `src/requests/adapters.py`, `HTTPAdapter.send()` accepts:
  - `def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):`
- `HTTPAdapter.send` passes `verify` and `cert` to:
  - file: `src/requests/adapters.py`
  - function: `HTTPAdapter.cert_verify(self, conn, url, verify, cert)`

`HTTPAdapter.cert_verify()` implements `verify=` as follows:

1. If the URL is HTTPS and `verify` is truthy:
   - `conn.cert_reqs = "CERT_REQUIRED"`
   - It chooses a CA bundle path:
     - if `verify` is a string, that string is used as the CA bundle/path
     - otherwise it uses `extract_zipped_paths(DEFAULT_CA_BUNDLE_PATH)`
   - It checks that path exists; otherwise it raises:
     - `OSError("Could not find a suitable TLS CA certificate bundle, invalid path: ...")`
   - If the path is a directory:
     - `conn.ca_cert_dir = cert_loc`
   - else:
     - `conn.ca_certs = cert_loc`

2. If verification is disabled:
   - `conn.cert_reqs = "CERT_NONE"`
   - `conn.ca_certs = None`
   - `conn.ca_cert_dir = None`

So specifically:
- `verify=True` → require certificate validation and use the default CA bundle
- `verify="/path/to/bundle"` → use that file or directory as the CA bundle
- `verify=False` → disable certificate verification entirely

Client certificate handling is in the same function (`src/requests/adapters.py`, `HTTPAdapter.cert_verify`):
- if `cert` is a tuple:
  - `conn.cert_file = cert[0]`
  - `conn.key_file = cert[1]`
- else:
  - `conn.cert_file = cert`
  - `conn.key_file = None`
- it validates referenced files and raises `OSError` if missing

For the default CA bundle and certifi integration:

- `src/requests/adapters.py` imports:
  - `from .utils import DEFAULT_CA_BUNDLE_PATH`
- In this snapshot, the actual default path originates from certifi:
  - `src/requests/certs.py`: `from certifi import where`
  - `src/requests/__init__.py`:
    - `from .certs import where`
    - `DEFAULT_CA_BUNDLE_PATH = where()`

So the default CA bundle path comes from `certifi.where()`, exposed as `requests.certs.where()` and stored as `requests.DEFAULT_CA_BUNDLE_PATH`; `HTTPAdapter.cert_verify()` uses that path via `DEFAULT_CA_BUNDLE_PATH` (through `extract_zipped_paths(DEFAULT_CA_BUNDLE_PATH)` when `verify is True`).

Related diagnostics also confirm this:
- `src/requests/help.py` reports `"ca_certs": certs.where()`, along with SSL-related info such as `"system_ssl": get_openssl_version()`, `"using_pyopenssl": has_cryptography`, `"pyOpenSSL": {"version": version("pyOpenSSL"), "openssl_version": get_openssl_version()}`, and `"urllib3": {"version": urllib3_version}`.
