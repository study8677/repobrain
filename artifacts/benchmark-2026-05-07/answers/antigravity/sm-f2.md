SQLModel uses `create_engine(...)` to create a new database engine.

Specifically:
- `sqlmodel/__init__.py` exposes `create_engine` by importing it from `sqlmodel.main`
- the implementation is `create_engine` in `sqlmodel/main.py`
- it wraps SQLAlchemy’s `create_engine`, imported there as `_create_engine`

So, `sqlmodel.create_engine()` wraps `sqlalchemy.create_engine()`.

This is the function used throughout the docs, including:
- `docs_src/tutorial/create_db_and_table/tutorial001_py310.py`
- `docs_src/tutorial/create_db_and_table/tutorial002_py310.py`
- `docs_src/tutorial/create_db_and_table/tutorial003_py310.py`
- `docs_src/tutorial/insert/tutorial001_py310.py`
- `docs_src/tutorial/many_to_many/tutorial001_py310.py`
- `docs_src/tutorial/one/tutorial001_py310.py`
- other files in `docs_src/tutorial/one/`
- `docs_src/tutorial/select/tutorial001_py310.py`
- `docs_src/tutorial/select/tutorial002_py310.py`
- `docs_src/tutorial/select/tutorial003_py310.py`
- `docs_src/tutorial/select/tutorial004_py310.py`
- `docs_src/tutorial/update/tutorial001_py310.py`
- `docs_src/tutorial/code_structure/tutorial001_py310/database.py`
- `docs_src/tutorial/relationship_attributes/cascade_delete_relationships/tutorial001_py310.py`
- `docs_src/tutorial/relationship_attributes/cascade_delete_relationships/tutorial002_py310.py`
- `docs_src/tutorial/relationship_attributes/cascade_delete_relationships/tutorial003_py310.py`
- `docs_src/tutorial/relationship_attributes/cascade_delete_relationships/tutorial004_py310.py`
- `docs_src/tutorial/relationship_attributes/cascade_delete_relationships/tutorial005_py310.py`

Example usage from the tutorials:
- `from sqlmodel import Field, Session, SQLModel, create_engine`
- `engine = create_engine(sqlite_url, echo=True)`
