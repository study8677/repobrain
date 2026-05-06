**Answer:** SQLModel does not wrap or define its own `create_engine`. It re-exports SQLAlchemy's directly: `from sqlalchemy.engine import create_engine as create_engine`. So calling `sqlmodel.create_engine(...)` is identical to calling `sqlalchemy.create_engine(...)`.

**Citations:**
- sqlmodel/__init__.py:4 (re-export)

**Confidence:** High
