`SQLModel` is defined in `sqlmodel/main.py` as:

- `class SQLModel(BaseModel, metaclass=SQLModelMetaclass):` at `sqlmodel/main.py:769`

So it directly combines:

1. `BaseModel`
2. `SQLModelMetaclass` as its metaclass

The metaclass itself is defined earlier in the same file:

- `class SQLModelMetaclass(ModelMetaclass, DeclarativeMeta):` at `sqlmodel/main.py:476`

That means the SQLAlchemy/Pydantic combination is implemented via:

- base class: `BaseModel`
- metaclass parents: `ModelMetaclass` and `DeclarativeMeta`

If by “two parent classes” you mean the class inheritance of `SQLModel` itself, the knowledge only shows one explicit parent class (`BaseModel`); the SQLAlchemy side is combined through the metaclass, not a second normal base class.
