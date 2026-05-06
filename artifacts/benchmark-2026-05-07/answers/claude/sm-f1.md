**Answer:** The `SQLModel` base class is defined at `sqlmodel/main.py:804` and combines `BaseModel` (Pydantic) with `SQLModelMetaclass` (which itself inherits from `ModelMetaclass` and `DeclarativeMeta`). Class signature: `class SQLModel(BaseModel, metaclass=SQLModelMetaclass, registry=default_registry):`

**Citations:**
- sqlmodel/main.py:804 (SQLModel definition)
- sqlmodel/main.py:521 (SQLModelMetaclass(ModelMetaclass, DeclarativeMeta))
- sqlmodel/main.py:25 (Pydantic BaseModel import)
- sqlmodel/main.py:48 (SQLAlchemy DeclarativeMeta import)

**Confidence:** High
