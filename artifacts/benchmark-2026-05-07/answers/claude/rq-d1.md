**Answer:** `HTTPAdapter` uses two tiers of urllib3 pools.

- **Primary**: a single `PoolManager(num_pools=_pool_connections, maxsize=_pool_maxsize, block=_pool_block)` built in `init_poolmanager` (adapters.py:239-267). urllib3 then internally maps host/scheme/port + SSL kwargs to a per-host `ConnectionPool`, evicting LRU when `num_pools` is exceeded.
- **Per-proxy**: a `self.proxy_manager` dict keyed by proxy URL; `proxy_manager_for` (adapters.py:269-305) lazily creates a `SOCKSProxyManager` or `proxy_from_url` on first use and caches it.

For each request, `get_connection_with_tls_context` (adapters.py:455-510) calls `select_proxy(url, ...)`, then `build_connection_pool_key_attributes` (adapters.py:403-453) which assembles `host_params` (scheme/host/port) plus `pool_kwargs` translating `verify`/`cert` into urllib3's `cert_reqs`/`ca_certs`/`ca_cert_dir`/`cert_file`/`key_file`. The right manager finally calls `connection_from_host(**host_params, pool_kwargs=pool_kwargs)` (adapters.py:501-507) to obtain a pool/connection.

The design is "composition + delegation": HTTPAdapter stores pool config and caches the urllib3 managers; users subclass it and override `init_poolmanager`, `build_connection_pool_key_attributes`, or `get_connection_with_tls_context` to customize.

**Citations:**
- src/requests/adapters.py:201-221 (init)
- src/requests/adapters.py:239-267 (init_poolmanager)
- src/requests/adapters.py:269-305 (proxy_manager_for)
- src/requests/adapters.py:403-453 (build_connection_pool_key_attributes)
- src/requests/adapters.py:455-510 (get_connection_with_tls_context)

**Confidence:** High
