Answer: `SQLModel` uses `SQLModelMetaclass`, which inherits SQLAlchemy `DeclarativeMeta`.
`table=True` is read in `__new__`; when `"config_table is True"`, fields are converted into `Column` attributes via `"setattr(new_cls, k, col)"`.
The mapper is registered later, in metaclass `__init__`, not by an explicit `mapper()` call in SQLModel.
There, `is_table_model_class(cls)` checks `model_config["table"]`; if no base is already a table model, SQLModel calls `"DeclarativeMeta.__init__"`.
That delegates class initialization to SQLAlchemy’s declarative metaclass, which performs the mapper registration using the inherited registry/metadata.
Citations: sqlmodel/main.py:521, sqlmodel/main.py:599, sqlmodel/main.py:600, sqlmodel/main.py:603, sqlmodel/main.py:605, sqlmodel/_compat.py:115, sqlmodel/_compat.py:118, sqlmodel/main.py:634, sqlmodel/main.py:635, sqlmodel/main.py:681, sqlmodel/main.py:799, sqlmodel/main.py:804
Confidence: High