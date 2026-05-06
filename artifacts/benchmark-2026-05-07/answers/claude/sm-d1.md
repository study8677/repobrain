**Answer:** SQLModel uses a dual-layer model:

1. **Extended `FieldInfo`** (main.py:103-168) subclasses Pydantic's `FieldInfo` and adds SQLAlchemy-only attributes: `primary_key`, `nullable`, `foreign_key`, `unique`, `index`, `sa_type`, `sa_column`, etc. Pydantic-side validation rules (`min_length`, `gt`, ...) keep flowing through the parent.
2. **`FieldInfoMetadata` wrapper** (main.py:458-471) packs the SQLAlchemy attributes into a dataclass that's appended to the FieldInfo's metadata list, so they don't leak into Pydantic's validation pipeline.
3. **Combined metaclass** `SQLModelMetaclass(ModelMetaclass, DeclarativeMeta)` (main.py:521) executes both class-creation paths: Pydantic harvests fields for validation, SQLAlchemy registers a mapper.
4. **Column synthesis** in `get_column_from_field` (main.py:740-796) reads the wrapped SQLAlchemy attrs via `_get_sqlmodel_field_value` helpers and emits a real `sqlalchemy.Column`, while Pydantic continues to own input validation.

End result: validation constraints live in Pydantic; column constraints live in SQLAlchemy; both reach the same class through metadata routing.

**Citations:**
- sqlmodel/main.py:103-168 (FieldInfo extension)
- sqlmodel/main.py:217-233 (metadata extraction)
- sqlmodel/main.py:458-471 (FieldInfoMetadata)
- sqlmodel/main.py:521 (SQLModelMetaclass)
- sqlmodel/main.py:740-796 (get_column_from_field)

**Confidence:** High
