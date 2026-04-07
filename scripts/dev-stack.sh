#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for cmd in docker dotnet vp nc; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "Missing command: $cmd"; exit 1; }
done

SQLSERVER_HOST="localhost"
SQLSERVER_PORT="1433"
SQLSERVER_DATABASE="keeper"
SQLSERVER_SA_PASSWORD="KeeperDev#2026!"
ASPNETCORE_URLS="http://localhost:5216"
WEB_HOST="0.0.0.0"
WEB_PORT="5173"
DB_WAIT_TIMEOUT_SECONDS=60
DB_READY_GRACE_SECONDS=20
DB_MIGRATION_RETRIES=8
RUN_DB_MIGRATIONS="true"
STOP_DB_ON_EXIT="false"

export ConnectionStrings__DefaultConnection="Server=${SQLSERVER_HOST},${SQLSERVER_PORT};Database=${SQLSERVER_DATABASE};User Id=sa;Password=${SQLSERVER_SA_PASSWORD};TrustServerCertificate=True;Encrypt=False"

echo "Starting SQL Server..."
docker compose up -d sqlserver

echo "Waiting for SQL Server port ${SQLSERVER_HOST}:${SQLSERVER_PORT}..."
for ((i = 1; i <= DB_WAIT_TIMEOUT_SECONDS; i++)); do
    if nc -z "$SQLSERVER_HOST" "$SQLSERVER_PORT" >/dev/null 2>&1; then
        break
    fi

    if [[ "$i" -eq "$DB_WAIT_TIMEOUT_SECONDS" ]]; then
        echo "SQL Server port did not open in time."
        exit 1
    fi

    sleep 1
done

echo "Waiting ${DB_READY_GRACE_SECONDS}s for SQL Server startup..."
sleep "$DB_READY_GRACE_SECONDS"

if [[ "$RUN_DB_MIGRATIONS" == "true" ]]; then
    if dotnet ef --version >/dev/null 2>&1; then
        echo "Applying migrations..."
        migration_success="false"
        for ((attempt = 1; attempt <= DB_MIGRATION_RETRIES; attempt++)); do
            if (
                cd "$ROOT_DIR/api/src"
                dotnet ef database update
            ); then
                migration_success="true"
                break
            fi

            if [[ "$attempt" -lt "$DB_MIGRATION_RETRIES" ]]; then
                echo "Migration attempt ${attempt}/${DB_MIGRATION_RETRIES} failed. Retrying in 4s..."
                sleep 4
            fi
        done

        if [[ "$migration_success" != "true" ]]; then
            echo "Migrations still failed. Continuing startup for dev."
            echo "Retry manually: cd api/src && dotnet ef database update"
        fi
    else
        echo "dotnet-ef not found. Skipping migrations."
    fi
fi

if [[ ! -d "$ROOT_DIR/web/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (
        cd "$ROOT_DIR/web"
        vp install
    )
fi

shutdown() {
    trap - EXIT INT TERM
    if [[ -n "${FRONTEND_PID:-}" ]]; then
        pkill -TERM -P "$FRONTEND_PID" >/dev/null 2>&1 || true
        kill "$FRONTEND_PID" >/dev/null 2>&1 || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [[ -n "${BACKEND_PID:-}" ]]; then
        pkill -TERM -P "$BACKEND_PID" >/dev/null 2>&1 || true
        kill "$BACKEND_PID" >/dev/null 2>&1 || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi

    [[ "${STOP_DB_ON_EXIT}" == "true" ]] && docker compose down || true
}

trap shutdown EXIT INT TERM

echo "Starting API..."
(
    cd "$ROOT_DIR/api/src"
    exec dotnet run
) &
BACKEND_PID="$!"

echo "Starting frontend..."
(
    cd "$ROOT_DIR/web"
    exec vp dev --host "$WEB_HOST" --port "$WEB_PORT"
) &
FRONTEND_PID="$!"

echo "Frontend: http://localhost:${WEB_PORT}"
echo "Backend:  ${ASPNETCORE_URLS}"
echo "SQL:      ${SQLSERVER_HOST}:${SQLSERVER_PORT}"
echo "Press Ctrl+C to stop"

while kill -0 "$BACKEND_PID" >/dev/null 2>&1 && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; do
    sleep 2
done

echo "A dev process exited."
exit 1
