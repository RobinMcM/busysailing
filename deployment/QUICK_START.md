# Quick Start Deployment Guide

This guide walks you through deploying the UK Tax Advisor application to a fresh DigitalOcean droplet.

## Prerequisites

Before running the setup script, have these ready:

1. **Domain Name**: e.g., `busysailing.com`
2. **Email Address**: For SSL certificate notifications
3. **Supabase Credentials** (optional but recommended):
   - Supabase URL: `https://xxxxx.supabase.co`
   - Supabase Service Key: `eyJhbGci...`
4. **AI API Keys** (at least ONE required):
   - **Groq API Key** (recommended): `gsk_...`
   - **OpenAI API Key** (alternative): `sk-...`

## Get Your API Keys

### Supabase (Optional - for analytics)
1. Visit: https://supabase.com/dashboard
2. Select your project
3. Go to: Settings → API
4. Copy:
   - Project URL
   - Service role key (secret)

### Groq API (Recommended for chat)
1. Visit: https://console.groq.com/keys
2. Create new API key
3. Copy the key (starts with `gsk_`)

### OpenAI API (For TTS voices)
1. Visit: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-`)

## Deployment Steps

### 1. SSH into your DigitalOcean droplet
```bash
ssh root@your-droplet-ip
```

### 2. Run the setup script
```bash
cd /root
git clone git@github.com:RobinMcM/busysailing.git
cd busysailing/deployment/scripts
chmod +x setup.sh
sudo bash setup.sh
```

### 3. Answer the prompts
The script will ask you for:
- GitHub repository URL: `git@github.com:RobinMcM/busysailing.git`
- Domain name: `busysailing.com`
- Email: Your email for SSL
- Database password: (Press Enter for auto-generated)
- Supabase URL: (Paste or press Enter to skip)
- Supabase Service Key: (Paste if you entered URL)
- Groq API Key: (Paste or press Enter to skip)
- OpenAI API Key: (Paste or press Enter to skip)

**Note**: You need at least ONE AI API key (Groq or OpenAI) for the chat to work!

### 4. Wait for deployment
The script will:
- Install Docker and dependencies
- Clone your repository
- Build Docker images (this takes 5-10 minutes)
- Request SSL certificate
- Start all services

### 5. Test your application
```bash
# Check running containers
docker ps

# View logs
docker compose logs -f

# Test the site
curl https://busysailing.com/health
```

## Troubleshooting

### If docker ps shows no containers:
```bash
cd /opt/uk-tax-advisor/app/deployment
docker compose up -d
docker compose logs -f
```

### If Wav2Lip service fails to start:
```bash
# Check wav2lip logs specifically
docker compose logs wav2lip

# Restart just that service
docker compose restart wav2lip
```

### If you need to edit environment variables:
```bash
cd /opt/uk-tax-advisor/app/deployment
nano .env
docker compose down
docker compose up -d
```

## Post-Deployment

### Create Supabase Analytics Table
If you configured Supabase, create the analytics table:

1. Visit: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Run the SQL from: `deployment/supabase-schema.sql`

### Test the Features
1. Visit `https://busysailing.com`
2. Enter password: `MKS2005`
3. Send a test message
4. Check admin dashboard at: `https://busysailing.com/admin` (password: MKS2005)

## Useful Commands

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f wav2lip

# Restart all services
docker compose restart

# Stop everything
docker compose down

# Update to latest code
cd /opt/uk-tax-advisor/app
git pull
docker compose build
docker compose up -d
```

## Security Notes

- Change default passwords (`CHAT_PASSWORD` and `ADMIN_PASSWORD`) in `.env` file
- Keep your API keys secure
- Never commit `.env` file to Git
- Regularly update SSL certificates (auto-renewed by certbot)
