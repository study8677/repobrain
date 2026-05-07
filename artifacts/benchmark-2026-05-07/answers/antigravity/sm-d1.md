SQLModel does this by layering Pydantic’s field system and SQLAlchemy’s declarative mapping into the same class creation flow in `sqlmodel/main.py`.

Key pieces:

- `Field()` in `sqlmodel/main.py` returns a Pydantic `FieldInfo`, but SQLModel extends it with SQLAlchemy-specific arguments like:
  - `primary_key`
  - `foreign_key`
  - `nullable`
  - `index`
  - `unique`
  - `sa_type`
  - `sa_column`
  - `sa_column_args`
  - `sa_column_kwargs`

  This happens in:
  - `sqlmodel/main.py` → `Field(...)`
  - it constructs and returns `FieldInfo(...)`

- `FieldInfo` in `sqlmodel/main.py` subclasses Pydantic’s field info and stores the SQLAlchemy metadata alongside normal validation metadata. Its `__init__` extracts and validates SQLAlchemy-specific options such as `primary_key`, `nullable`, `foreign_key`, `ondelete`, `unique`, `index`, `sa_type`, `sa_column`, `sa_column_args`, `sa_column_kwargs`.

  Relevant source:
  - `sqlmodel/main.py` → `class FieldInfo(PydanticFieldInfo)`

- During model class creation, the metaclass merges both systems:
  - `SQLModelMetaclass` inherits from both `ModelMetaclass` (Pydantic) and `DeclarativeMeta` (SQLAlchemy)
  - in `__new__`, it separates relationship attributes from normal Pydantic fields, builds the class via Pydantic, and then later SQLAlchemy mapping is applied for table models.

  Relevant source:
  - `sqlmodel/main.py` → `class SQLModelMetaclass(ModelMetaclass, DeclarativeMeta)`
  - `sqlmodel/main.py` → `SQLModelMetaclass.__new__`

- For table models, SQLModel converts each Pydantic field into a SQLAlchemy `Column`:
  - `get_column_from_field(field)` reads the `FieldInfo`
  - determines SQL type via `get_sqlalchemy_type(field)`
  - builds a `Column(...)` using both validation-derived information and SQLAlchemy metadata from `FieldInfo`

  Relevant source:
  - `sqlmodel/main.py` → `get_sqlalchemy_type(field)`
  - `sqlmodel/main.py` → `get_column_from_field(field)`

- The actual reconciliation happens in the metaclass when `table=True` is set:
  - it iterates over model fields
  - calls `get_column_from_field(v)`
  - sets each resulting `Column` back on the class with `setattr(new_cls, k, col)`

  Relevant source:
  - `sqlmodel/main.py` → inside `SQLModelMetaclass.__new__`, in the `config_table is True` branch

- Type/validation metadata comes from Pydantic-side field definitions and annotations; SQLAlchemy column type is inferred from that via:
  - `get_sa_type_from_field(field)`
  - `get_sqlalchemy_type(field)`

So, in one sentence: SQLModel stores SQLAlchemy column options inside its custom `FieldInfo`, lets Pydantic build and validate fields normally, and then in `SQLModelMetaclass.__new__` turns those same fields into SQLAlchemy `Column` objects with `get_column_from_field()` for `table=True` models.

Most relevant source locations:
- `sqlmodel/main.py`:
  - `class FieldInfo(PydanticFieldInfo)`
  - `def Field(...)`
  - `class SQLModelMetaclass(ModelMetaclass, DeclarativeMeta)`
  - `def get_sa_type_from_field(...)`
  - `def get_sqlalchemy_type(...)`
  - `def get_column_from_field(...)`
