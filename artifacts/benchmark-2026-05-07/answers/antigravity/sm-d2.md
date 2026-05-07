`Field()` in SQLModel is the unified field-declaration helper for `SQLModel` classes: it attaches both Pydantic-style validation/default metadata and SQLAlchemy table/column metadata to a model attribute.

In `sqlmodel/main.py`, `Field()` is defined there and returns `FieldInfo(...)`. SQLModel’s `FieldInfo` subclasses Pydantic’s field info (`class FieldInfo(PydanticFieldInfo)`), but adds SQL-specific attributes such as:

- `primary_key`
- `nullable`
- `foreign_key`
- `ondelete`
- `unique`
- `index`
- `sa_type`
- `sa_column`
- `sa_column_args`
- `sa_column_kwargs`

Its signature also includes Pydantic-like options such as:

- `default`, `default_factory`, `alias`, `title`, `description`
- validation constraints like `gt`, `ge`, `lt`, `le`, `min_length`, `max_length`, `regex`

So compared to `pydantic.Field`:
- `pydantic.Field` provides validation/schema metadata.
- `sqlmodel.Field` builds on that, but also carries SQL/database configuration.

Compared to `sqlalchemy.Column`:
- `Field()` is not itself a `Column`.
- It is higher-level metadata on a model field.
- SQLModel later turns that metadata into a real SQLAlchemy column via `get_column_from_field()` in `sqlmodel/main.py`.

`get_column_from_field()`:
- reads the `FieldInfo`
- returns `field_info.sa_column` directly if provided
- otherwise computes the SQLAlchemy type with `get_sqlalchemy_type()`
- then builds `Column(...)` with `primary_key`, `nullable`, `index`, `unique`, defaults, foreign keys, and extra args/kwargs

There are also enforced restrictions in `FieldInfo.__init__()` and tests: if `sa_column` is supplied, you cannot also pass `primary_key`, `nullable`, `foreign_key`, `ondelete`, `unique`, `index`, `sa_type`, `sa_column_args`, or `sa_column_kwargs`. Tests also show `Field()` cannot be used for relationships via `sa_relationship` (`tests/test_field_sa_relationship.py`).

This behavior is exercised in tests:
- `tests/test_field_sa_args_kwargs.py`: `Field(sa_column_args=[...], sa_column_kwargs={...})`
- `tests/test_field_sa_column.py`: `Field(sa_column=Column(...))`, plus invalid combinations with `primary_key`, `nullable`, `foreign_key`, `ondelete`, `unique`, `index`, `sa_type`
- `tests/test_pydantic/test_field.py`: Pydantic-like field behavior
- `tests/test_aliases.py`: `Field(alias="...")`
- `tests/test_nullable.py`: `Field(nullable=...)`
- `tests/test_main.py`: `Field(default=..., primary_key=True, foreign_key=..., index=True)`

The docs examples show the intended user-facing role:
- `docs_src/tutorial/create_db_and_table/tutorial001_py310.py`:
  - `id: int | None = Field(default=None, primary_key=True)`
- `docs_src/tutorial/create_db_and_table/tutorial002_py310.py`:
  - `age: int | None = Field(default=None, index=True)`
- `docs_src/tutorial/create_db_and_table/tutorial003_py310.py`:
  - `name: str = Field(index=True)`
- `docs_src/tutorial/one/tutorial001_py310.py`:
  - `id: int | None = Field(default=None, primary_key=True)`

In short:
- `pydantic.Field`: validation/schema metadata
- `sqlalchemy.Column`: actual SQLAlchemy column object
- `sqlmodel.Field` in `sqlmodel/main.py`: the bridge API that unifies both, storing metadata in `FieldInfo` and feeding column creation through `get_column_from_field()` in `sqlmodel/main.py`
