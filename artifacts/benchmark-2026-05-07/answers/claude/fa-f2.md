**Answer:** The OpenAPI schema generator is split between class and helper:
- The entry point is `FastAPI.openapi()` in `fastapi/applications.py:1068`. It caches `self.openapi_schema` to avoid regenerating per request.
- The actual schema is built by the standalone `get_openapi()` function in `fastapi/openapi/utils.py:514`, which `applications.py:1083` invokes.

**Citations:**
- fastapi/applications.py:1068 (FastAPI.openapi)
- fastapi/applications.py:1083 (calls get_openapi)
- fastapi/openapi/utils.py:514 (get_openapi)

**Confidence:** High
