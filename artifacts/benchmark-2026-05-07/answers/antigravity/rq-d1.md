`requests` chooses a `urllib3` connection pool in `src/requests/adapters.py`, mainly through `HTTPAdapter`.

- `HTTPAdapter.__init__` stores pool configuration:
  - `_pool_connections`: number of cached pools
  - `_pool_maxsize`: max connections per pool
  - `_pool_block`: whether pool acquisition blocks
  - then calls `HTTPAdapter.init_poolmanager(...)`

- `HTTPAdapter.init_poolmanager(self, connections, maxsize, block=DEFAULT_POOLBLOCK, **pool_kwargs)` creates and stores a single `urllib3.PoolManager` on `self.poolmanager`:
  - `PoolManager(num_pools=connections, maxsize=maxsize, block=block, **pool_kwargs)`

How pool selection happens:

1. For normal requests, `HTTPAdapter.get_connection(self, url, proxies=None)` is used.
2. If no proxy applies, it calls:
   - `self.poolmanager.connection_from_url(url)`
3. If a proxy applies, it first gets a proxy manager via:
   - `HTTPAdapter.proxy_manager_for(self, proxy, **proxy_kwargs)`
   - then uses either:
     - `proxy_manager.connection_from_url(url)` for SOCKS proxies, or
     - `proxy_manager.connection_from_url(url)` / `proxy_manager.connection_from_host(...)` depending on proxy path logic
4. The actual choice between pools is therefore delegated to the `urllib3` `PoolManager`/proxy manager, with `requests` selecting the manager based on proxy vs direct connection.

`HTTPAdapter` design:

- File: `src/requests/adapters.py`
- Main class: `HTTPAdapter(BaseAdapter)`

Responsibilities:
- Maintain connection pooling state
- Translate Requests’ `PreparedRequest` into urllib3 calls
- Handle proxies, TLS verification, certs, retries, and timeouts
- Build the final `Response`

Key methods:
- `__init__`: configure retries and pool sizes
- `init_poolmanager`: create the base `PoolManager`
- `proxy_manager_for`: cache per-proxy managers in `self.proxy_manager`
- `get_connection`: choose direct pool manager vs proxy manager
- `cert_verify`: configure CA bundle / cert requirements
- `build_response`: convert urllib3 response into `requests.models.Response`
- `send`: main request path; gets connection, verifies certs, prepares timeout via `TimeoutSauce`, calls `conn.urlopen(...)`
- `close`: clears `self.poolmanager` and any cached proxy managers

Mounting/design intent:
- `HTTPAdapter` is the transport adapter for HTTP/HTTPS.
- A `Session` mounts adapters per URL prefix, and the adapter encapsulates all connection-pool behavior for those prefixes.
- Within an adapter, pools are not chosen manually by `requests`; instead, `requests` picks the right manager in `get_connection`, and `urllib3` manages/cache-selects the concrete host-specific pool.
