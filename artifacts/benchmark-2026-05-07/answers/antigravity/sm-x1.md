When a SQLModel class uses `table=True`, the metaclass triggers SQLAlchemy's automatic database mapping. The metaclass's logic is to define a class that represents a database table, which is handled by SQLAlchemy's session manager. The process involves:

1. Defining the `SQLModel` class with `table=True`.
2. The session manager initializes the mapping by creating the table in the database.  
**Citation**: The metaclass directly defines the SQL map for the database table, while the session manager handles the registration through its session manager logic.
