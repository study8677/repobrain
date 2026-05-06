Answer: `fastapi/applications.py`, class `FastAPI`, implements the automatic OpenAPI entry point.
Answer: The entry method name is `openapi`.
Answer: `FastAPI.openapi()` is documented as “Generate the OpenAPI schema” and calls `get_openapi(...)`.
Answer: The generated `/openapi.json` handler calls `self.openapi()`.
Citations: fastapi/applications.py:41, fastapi/applications.py:1068, fastapi/applications.py:1070, fastapi/applications.py:1082, fastapi/openapi/utils.py:514, fastapi/applications.py:1106
Confidence: High