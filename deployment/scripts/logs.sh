#!/bin/bash

# View logs for all services or a specific service
# Usage: ./logs.sh [service_name] [lines]

SERVICE=${1:-}
LINES=${2:-50}

cd /opt/uk-tax-advisor/app/deployment

if [ -z "$SERVICE" ]; then
    echo "📊 Viewing logs for all services (last $LINES lines)..."
    docker compose logs --tail="$LINES" -f
else
    echo "📊 Viewing logs for $SERVICE (last $LINES lines)..."
    docker compose logs --tail="$LINES" -f "$SERVICE"
fi
