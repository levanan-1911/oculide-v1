#!/bin/bash
# ==============================================================================
# database/init-db.sh
#
# Auto-initializes the ExamSystem database on first container start.
# SQL Server does NOT support a PostgreSQL-style /docker-entrypoint-initdb.d/
# mechanism, so we use a sentinel file to run schema.sql exactly once.
# ==============================================================================

SENTINEL="/var/opt/mssql/.schema_initialized"

if [ -f "$SENTINEL" ]; then
    echo "[init-db] Schema already initialized — skipping."
    exit 0
fi

echo "[init-db] Waiting for SQL Server to be ready..."
for i in $(seq 1 30); do
    /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "${SA_PASSWORD}" \
        -No -Q "SELECT 1" > /dev/null 2>&1 && break
    echo "[init-db]   attempt $i/30 — not ready yet, waiting 3s..."
    sleep 3
done

echo "[init-db] Running schema.sql..."
/opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${SA_PASSWORD}" \
    -No \
    -i /schema.sql \
    -o /var/opt/mssql/schema_init.log

if [ $? -eq 0 ]; then
    touch "$SENTINEL"
    echo "[init-db] Schema initialized successfully!"
    cat /var/opt/mssql/schema_init.log
else
    echo "[init-db] Schema initialization FAILED. See log:"
    cat /var/opt/mssql/schema_init.log
    exit 1
fi
