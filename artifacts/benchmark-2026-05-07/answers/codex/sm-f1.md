Answer: `SQLModel` is defined in `sqlmodel/main.py` at line 804.
It directly subclasses Pydantic `BaseModel`.
Its metaclass, `SQLModelMetaclass`, combines `ModelMetaclass` and `DeclarativeMeta`.
Short snippets: `class SQLModel(BaseModel` and `class SQLModelMetaclass(ModelMetaclass, DeclarativeMeta)`.
Citations: `sqlmodel/main.py:804`, `sqlmodel/main.py:521`, `sqlmodel/_compat.py:24`, `sqlmodel/main.py:48`
Confidence: High