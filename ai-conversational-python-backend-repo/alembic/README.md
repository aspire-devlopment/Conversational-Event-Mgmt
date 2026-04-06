# Alembic Migrations

This backend now includes Alembic migration support.

## Existing Database

The current PostgreSQL schema already exists from the Node backend setup in
`backend/Database.sql`. Because of that, the first step is to stamp the
baseline revision instead of trying to recreate the schema:

```bash
cd python_backend
alembic stamp 0001_baseline_existing_schema
```

## Future Migrations

Create a new migration after the baseline is stamped:

```bash
alembic revision -m "add new feature table"
```

Apply migrations:

```bash
alembic upgrade head
```
