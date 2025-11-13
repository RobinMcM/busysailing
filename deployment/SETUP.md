# Digital Ocean Deployment Guide

This guide explains how to deploy the UK Tax Advisor app to Digital Ocean using your Replit database and API keys.

## Prerequisites

- Digital Ocean droplet (Ubuntu 22.04, 4GB RAM minimum)
- Docker and Docker Compose installed on the droplet
- Git installed on the droplet
- Domain name pointed to your droplet's IP (optional, for SSL)

## Architecture Overview

The deployment uses:
- **Database**: Your existing Replit PostgreSQL database (accessed remotely)
- **Avatar Videos**: AvatarTalk.ai API
- **AI Chat**: Groq API (primary) with OpenAI fallback
- **Hosting**: Docker containers with Nginx reverse proxy

## Step 1: Get Your Replit Secrets

In your Replit project, open the **Secrets** tab (lock icon in sidebar) and copy these values:

```
DATABASE_URL          (PostgreSQL connection string)
GROQ_API_KEY         (Groq API key)
AVATARTALK_API_KEY   (AvatarTalk API key)
OPENAI_API_KEY       (Optional - for TTS voices)
ADMIN_PASSWORD       (Optional - defaults to MKS2005)
```

**Important:** The `DATABASE_URL` should look like:
```
postgresql://username:password@host.postgres.replit.com:5432/database
```

## Step 2: SSH into Your Digital Ocean Droplet

```bash
ssh root@your-droplet-ip
```

## Step 3: Install Docker and Docker Compose

```bash
# Update package list
apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

## Step 4: Clone Your Repository

```bash
# Clone your repository (replace with your Git URL)
git clone https://github.com/your-username/your-repo.git
cd your-repo/deployment
```

## Step 5: Create Environment File

Create a `.env` file with your Replit secrets:

```bash
nano .env
```

Paste the following and **replace with your actual values from Replit Secrets**:

```bash
# Database (copy from Replit Secrets: DATABASE_URL)
DATABASE_URL=postgresql://user:password@host.postgres.replit.com:5432/database

# AI Services (copy from Replit Secrets)
GROQ_API_KEY=your_actual_groq_api_key_here
AVATARTALK_API_KEY=your_actual_avatartalk_api_key_here

# Optional (copy from Replit Secrets if you have it)
OPENAI_API_KEY=your_actual_openai_api_key_here

# Admin Settings
ADMIN_PASSWORD=MKS2005
NODE_ENV=production
PORT=5000

# Domain (update if using SSL)
DOMAIN_NAME=yourdomain.com
EMAIL=your-email@example.com
```

Save the file: `Ctrl + O`, `Enter`, `Ctrl + X`

## Step 6: Build and Start the Application

```bash
# Build and start containers
docker-compose up -d --build

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f app
```

## Step 7: Verify the Application

Visit your droplet's IP address in a browser:
```
http://your-droplet-ip:5000
```

You should see the chat interface. Enter the password `MKS2005` to unlock.

## Step 8: Set Up SSL (Optional but Recommended)

### Update nginx configuration for your domain:

1. Edit `nginx/nginx-bootstrap.conf` and replace `yourdomain.com` with your actual domain
2. Run certbot to get SSL certificate:

```bash
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com \
  --email your-email@example.com \
  --agree-tos
```

3. Update nginx to use SSL config:

```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Change this line:
# - ./nginx/nginx-bootstrap.conf:/etc/nginx/nginx.conf:ro
# To:
# - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

4. Restart nginx:

```bash
docker-compose restart nginx
```

Your app is now available at: `https://yourdomain.com`

## Updating the Application

When you make changes to your code in Replit and push to Git:

```bash
# SSH into droplet
ssh root@your-droplet-ip
cd your-repo/deployment

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f app
```

## Troubleshooting

### Error: "DATABASE_URL must be set"
- Check that `.env` file exists in the `deployment` folder
- Verify the DATABASE_URL is correctly copied from Replit Secrets
- Restart containers: `docker-compose restart`

### Error: "Connection refused" to database
- Verify your Replit database allows external connections
- Check the DATABASE_URL format is correct
- Test connection: `docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"`

### App not accessible
- Check if containers are running: `docker-compose ps`
- View logs: `docker-compose logs -f app`
- Check firewall: `ufw allow 5000` (for testing) or `ufw allow 80` and `ufw allow 443` (for production)

### Video generation fails
- Verify AVATARTALK_API_KEY is correct
- Check API key has sufficient credits
- View logs: `docker-compose logs -f app`

## Managing Costs

The app uses your existing Replit database remotely, so you only pay for:
- Digital Ocean droplet (~$24/month for 4GB RAM)
- API usage (Groq, AvatarTalk, OpenAI)
- Bandwidth

Database costs are covered by your Replit subscription.

## Security Notes

- Never commit the `.env` file to Git (it's in `.gitignore`)
- Rotate API keys regularly
- Use strong passwords for admin access
- Keep Docker and system packages updated:
  ```bash
  apt update && apt upgrade -y
  docker-compose pull
  docker-compose up -d
  ```

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f app`
2. Verify all environment variables are set correctly
3. Ensure your Replit database is accessible externally
4. Check API key validity and quota

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Digital Ocean Droplet                     │
│                                                               │
│  ┌────────────┐      ┌──────────────┐                       │
│  │   Nginx    │─────▶│  Node.js App │                       │
│  │  (Reverse  │      │  (Port 5000) │                       │
│  │   Proxy)   │      └──────┬───────┘                       │
│  └────────────┘             │                                │
│   Port 80/443               │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                              ├─────▶ Replit PostgreSQL (remote)
                              │
                              ├─────▶ Groq API (chat)
                              │
                              ├─────▶ AvatarTalk API (videos)
                              │
                              └─────▶ OpenAI API (optional TTS)
```

The application runs in Docker on your droplet but uses Replit's database and external APIs for all services.
