SQLModel handles Pydantic field validation with SQLAlchemy column metadata in a single model class by integrating the two systems. Here's how it works:

1. **Model Definition with SQLAlchemy**: When defining a model using SQLModel, SQLAlchemy's column metadata (such as `sqlalchemy_column_metadata`) is directly linked to Pydantic field annotations. For example, in a model class:

```python
from sqlmodel import Column, create_engine, and as_sql_model

engine = create_engine("sqlite:///mydb.db")

# Define fields with SQLAlchemy metadata
model_class = as_sql_model(
    columns=[
        Column("id", type_=int, primary_key=True),
        Column("name", type_=str, unique=True),
        # ... SQLAlchemy column metadata for other fields
    ],
    engine=engine
)
```

2. **Pydantic Field Validation**: Pydantic field validation is enforced by specifying types (e.g., `Field(default_factory=datetime.now)`) and ensuring that SQLAlchemy columns match these types. This prevents invalid data from being stored in the database.

3. **Validation Enforcement**: SQLAlchemy’s metadata ensures that database columns align with Pydantic field types. If inconsistencies arise, SQLModel automatically reconciles them, preventing invalid values.

**Citation**: The Field function in SQLModel includes parameters for SQLAlchemy column metadata, which directly ties to Pydantic field annotations, ensuring both validation and mapping are enforced in a single model class.
