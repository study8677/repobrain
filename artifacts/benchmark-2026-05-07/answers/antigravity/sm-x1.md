`table=True` is handled in the `SQLModelMetaclass`, and that metaclass ultimately delegates class creation to SQLAlchemy’s declarative metaclass, which is what registers the mapper.

Trace:

1. **`SQLModel` uses `SQLModelMetaclass`**
   - File: `sqlmodel/main.py`
   - `class SQLModel(..., metaclass=SQLModelMetaclass, registry=default_registry):` at **~line 770**
   - This means every subclass of `SQLModel` is created through `SQLModelMetaclass`.

2. **Metaclass detects `table=True`**
   - File: `sqlmodel/main.py`
   - In `SQLModelMetaclass.__new__` at **~lines 497–584**
   - It calls `get_config("table")` via `get_config(name="table")` / `is_table_model_class(...)` logic.
   - Specifically, when `config_table is True`, it iterates model fields and converts them into SQLAlchemy `Column`s:
     - `setattr(new_cls, k, get_column_from_field(v))` at **~lines 557–563**
   - It also sets config flags:
     - `set_config_value(model=new_cls, parameter="read_from_attributes", value=True)`
     - `set_config_value(model=new_cls, parameter="read_with_orm_mode", value=True)`
     - around **~lines 564–574**

3. **Registry / metadata / abstract flags are installed**
   - File: `sqlmodel/main.py`
   - Still in `SQLModelMetaclass.__new__`, if a registry is provided, it sets:
     - `_sa_registry`
     - `metadata`
     - `__abstract__ = True`
     - around **~lines 576–584**
   - `default_registry` itself is created earlier as:
     - `default_registry = registry()`
     - at **~line 763**

4. **Metaclass `__init__` decides whether to invoke SQLAlchemy declarative setup**
   - File: `sqlmodel/main.py`
   - `SQLModelMetaclass.__init__` at **~lines 586–645**
   - Critical branch:
     - `base_is_table = any(is_table_model_class(base) for base in bases)` at **~line 598**
     - Then:
       - if **any base is a table model**, SQLModel avoids re-processing relationships in a way that would conflict
       - otherwise, it calls `DeclarativeMeta.__init__(cls, classname, bases, dict_, **kw)` at **~line 642**
       - else branch for pure Pydantic side uses `ModelMetaclass.__init__(...)` at **~line 644**

5. **Why this registers the mapper**
   - `SQLModelMetaclass` inherits from **both** `ModelMetaclass` and `DeclarativeMeta`
   - File: `sqlmodel/main.py`
   - `class SQLModelMetaclass(ModelMetaclass, DeclarativeMeta):` at **~line 476**
   - The actual SQLAlchemy mapper registration is not implemented directly in SQLModel; it happens because `SQLModelMetaclass.__init__` invokes **`DeclarativeMeta.__init__`** for declarative classes.
   - That SQLAlchemy declarative metaclass is the mechanism that performs ORM class instrumentation / mapper setup.

6. **How “table model” is recognized**
   - File: `sqlmodel/_compat.py`
   - `is_table_model_class(cls)` at **~lines 121–126**
   - It checks model config for `"table"`:
     - returns `get_config("table") is True`

So the mechanism is:

- user writes `class Hero(SQLModel, table=True): ...`
- `SQLModelMetaclass.__new__` sees `table=True` and turns fields into `Column`s in `sqlmodel/main.py` **~557–563**
- then `SQLModelMetaclass.__init__` delegates to **`DeclarativeMeta.__init__`** in `sqlmodel/main.py` **~642**
- that SQLAlchemy declarative metaclass performs the actual mapper registration.

If you want the exact internal SQLAlchemy mapper-registration call chain beyond `DeclarativeMeta.__init__`, that is **not covered by the provided `sqlmodel` module knowledge**.
