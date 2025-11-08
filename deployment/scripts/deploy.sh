#!/bin/bash

# Deployment Script - Update running application from GitHub
# Usage: ./deploy.sh [branch]

set -e

BRANCH=${1:-main}

echo "🚀 UK Tax Advisor - Deployment Script"
echo "======================================"
echo "Branch: $BRANCH"
echo ""

# Change to app directory
cd /opt/uk-tax-advisor/app

echo "📥 Step 1: Pulling latest code from GitHub..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "🏗️  Step 2: Rebuilding containers..."
cd deployment
docker compose build --no-cache

echo "🔄 Step 3: Restarting services with zero-downtime..."
# Pull new images first
docker compose pull

# Restart services one at a time to minimize downtime
docker compose up -d --no-deps --build app
sleep 5
docker compose up -d --no-deps --build wav2lip
sleep 3
docker compose up -d --no-deps nginx

echo "🧹 Step 4: Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete!"
echo ""
echo "📊 Service status:"
docker compose ps

echo ""
echo "📝 Recent logs (last 20 lines):"
docker compose logs --tail=20

echo ""
echo "🔍 Health check:"
echo "Run: curl https://$(hostname -f)/health"
echo ""
