**Answer:** Two-phase metaclass action.

**Phase 1 — `SQLModelMetaclass.__new__`** (main.py:540-624). It detects `table=True` (line 600), then for every Pydantic field calls `get_column_from_field()` and `setattr`s a real SQLAlchemy `Column` onto the class body (lines 603-605). At this point the class *looks* SQLAlchemy-mapped to whatever runs next.

**Phase 2 — `SQLModelMetaclass.__init__`** (main.py:627-684). For table classes with no other table-base, it processes relationships, then explicitly calls `DeclarativeMeta.__init__()` (line 681). That call walks the now-Column-decorated class and registers a mapper against the `default_registry` baked into the SQLModel base (`registry=default_registry` on main.py:804). After this, ORM instrumentation is in place.

The combined metaclass `SQLModelMetaclass(ModelMetaclass, DeclarativeMeta)` (main.py:521) is what allows the same class to satisfy both Pydantic's MRO and SQLAlchemy's declarative registration.

**Citations:**
- sqlmodel/main.py:521 (combined metaclass)
- sqlmodel/main.py:599-605 (Column attach)
- sqlmodel/main.py:635-681 (DeclarativeMeta.__init__ call)
- sqlmodel/main.py:804 (registry=default_registry)

**Confidence:** High
