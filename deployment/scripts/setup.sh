#!/bin/bash

# DigitalOcean Droplet Setup Script
# This script prepares a fresh Ubuntu droplet for deployment

set -e

echo "🚀 UK Tax Advisor - DigitalOcean Setup Script"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use: sudo bash setup.sh)"
  exit 1
fi

echo "📦 Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y

echo "🐳 Step 2: Installing Docker..."
# Remove old Docker versions
apt-get remove -y docker docker-engine docker.io containerd runc || true

# Install prerequisites
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "✅ Docker installed successfully"
docker --version

echo "🔧 Step 3: Installing Docker Compose..."
# Docker Compose is now included as a plugin
docker compose version

echo "🔥 Step 4: Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw status

echo "📁 Step 5: Creating application directory..."
mkdir -p /opt/uk-tax-advisor
cd /opt/uk-tax-advisor

echo "🔑 Step 6: Setting up Git SSH key..."
echo ""
echo "To clone your private repository, you need to add an SSH key to GitHub:"
echo "1. Generate SSH key on this droplet (if not already done):"
echo "   ssh-keygen -t ed25519 -C 'digitalocean-droplet'"
echo "2. Display public key:"
echo "   cat ~/.ssh/id_ed25519.pub"
echo "3. Add this key to GitHub: https://github.com/settings/keys"
echo ""
read -p "Press Enter when you've added the SSH key to GitHub..."

echo "📥 Step 7: Cloning repository..."
read -p "Enter your GitHub repository URL (SSH format, e.g., git@github.com:user/repo.git): " REPO_URL

# Add GitHub to known hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts

# Clone the repository
git clone "$REPO_URL" app
cd app/deployment

echo "⚙️  Step 8: Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.template .env
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file with your actual credentials:"
    echo "   nano .env"
    echo ""
    echo "You need to set:"
    echo "  - POSTGRES_PASSWORD (secure random password)"
    echo "  - AI_INTEGRATIONS_OPENAI_API_KEY"
    echo "  - GROQ_API_KEY"
    echo "  - DOMAIN_NAME (your domain)"
    echo "  - EMAIL (for SSL certificates)"
    echo ""
    read -p "Press Enter when you've edited the .env file..."
fi

echo "🔐 Step 9: Getting SSL certificate information..."
read -p "Enter your domain name: " DOMAIN
read -p "Enter your email for SSL notifications: " EMAIL

echo "🏗️  Step 10: Building services..."
docker compose build

echo "🚀 Step 11: Starting nginx temporarily (without SSL)..."
# Backup the SSL config and use initial config first
cp nginx/nginx.conf nginx/nginx-ssl.conf.bak
cp nginx/nginx-initial.conf nginx/nginx.conf
docker compose up -d nginx

# Wait for nginx to be ready
sleep 5

echo "📜 Step 12: Requesting SSL certificate..."
# Request SSL certificate (nginx is now running and can serve the challenge)
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email

echo "🔧 Step 13: Configuring nginx with SSL..."
# Restore the SSL config and update domain name
cp nginx/nginx-ssl.conf.bak nginx/nginx.conf
sed -i "s/DOMAIN_NAME/$DOMAIN/g" nginx/nginx.conf

echo "🔄 Step 14: Restarting nginx with SSL enabled..."
docker compose restart nginx

echo "🚀 Step 15: Starting all remaining services..."
docker compose up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 Your application should now be running at: https://$DOMAIN"
echo ""
echo "📊 Useful commands:"
echo "  - View logs: docker compose logs -f"
echo "  - Check status: docker compose ps"
echo "  - Stop services: docker compose down"
echo "  - Update app: ./scripts/deploy.sh"
echo ""
echo "🔍 Next steps:"
echo "  1. Visit https://$DOMAIN to test your app"
echo "  2. Check health endpoints:"
echo "     - https://$DOMAIN/health"
echo "     - https://$DOMAIN/api/wav2lip/health"
echo "  3. Monitor logs for any errors"
echo ""
