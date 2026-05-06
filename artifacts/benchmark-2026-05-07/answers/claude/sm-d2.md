**Answer:** SQLModel's `Field()` is a single function that returns the extended `FieldInfo` (main.py:365-472). It supports three overloads but always exposes both Pydantic validation kwargs *and* SQLAlchemy column kwargs.

- `pydantic.Field` only carries validation/serialization metadata (default, gt, max_length, …). It has no DB awareness.
- `sqlalchemy.Column` only carries DB-side column shape (type, primary_key, index, foreign_key, …) and no validation.
- `sqlmodel.Field` carries *both*. Validation kwargs flow into the parent FieldInfo; DB kwargs (`primary_key`, `foreign_key`, `unique`, `nullable`, `index`, `sa_type`, `sa_column`) are stored in a `FieldInfoMetadata` wrapper and later consumed by `get_column_from_field` (main.py:740) to synthesize a real Column.

The escape hatch is `sa_column=`: passing a fully-built `Column` overrides every other SQLAlchemy kwarg, and SQLModel forbids combining them (main.py:116-154 documents the conflict; ValueErrors at 118-130) to keep the source of truth single.

**Citations:**
- sqlmodel/main.py:103-168 (extended FieldInfo)
- sqlmodel/main.py:365-472 (Field overloads)
- sqlmodel/main.py:118-130 (sa_column conflict guard)
- sqlmodel/main.py:740-796 (get_column_from_field)

**Confidence:** High
