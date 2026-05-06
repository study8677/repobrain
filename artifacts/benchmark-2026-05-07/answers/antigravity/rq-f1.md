The `Session` class is defined in `src/requests/sessions.py`, and it uses the default HTTP adapter set in the tests (e.g., `HTTPAdapter()` with specific prefixes for endpoints). 

**Answer**:  
The `Session` class is defined in `src/requests/sessions.py`, and it mounts by default using the default HTTP adapter as specified in the tests.  

**Cite**:  
- File: `src/requests/sessions.py:901` for the `session()` function.  
- File: `src/requests/sessions.py:881` for the `mount()` method.  
- Test cases use `HTTPAdapter()` with parameters like "http://git" or similar.
