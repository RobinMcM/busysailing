# DigitalOcean Deployment Guide
## UK Tax & Finance Advisor with Wav2Lip Lip-Sync

This guide will help you deploy your complete application (Node.js app + Wav2Lip Flask service + PostgreSQL database) to a single DigitalOcean droplet.

---

## 📋 Prerequisites

Before you begin, make sure you have:

- [ ] DigitalOcean account ([Sign up](https://www.digitalocean.com))
- [ ] GitHub account with your code pushed
- [ ] Domain name (optional, but recommended for SSL)
- [ ] API keys:
  - OpenAI API key
  - Groq API key

---

## 💰 Cost Estimate

**Recommended Droplet:** 8GB RAM / 4 vCPU / 160GB SSD

- **Cost:** ~$48-63/month
- **Runs:** All services (app + Wav2Lip + database) on one server
- **Bandwidth:** 5TB included
- **Savings:** ~$50-100/month vs separate hosting services

---

## 🚀 Part 1: Create DigitalOcean Droplet

### Step 1: Create Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **"Create"** → **"Droplets"**
3. Configure your droplet:

| Setting | Value |
|---------|-------|
| **Image** | Ubuntu 22.04 (LTS) x64 |
| **Plan** | Basic |
| **CPU Options** | Regular (Intel/AMD) |
| **Size** | 8GB RAM / 4 vCPUs / 160GB SSD ($48-63/mo) |
| **Datacenter** | Choose closest to UK (e.g., London, Amsterdam, Frankfurt) |
| **Authentication** | SSH Key (recommended) or Password |
| **Hostname** | uk-tax-advisor |

4. Click **"Create Droplet"**
5. Wait 1-2 minutes for droplet to be ready

### Step 2: Note Your Droplet IP

Once created, you'll see your droplet's **IPv4 address** (e.g., `134.122.45.67`)

Save this - you'll need it!

---

## 🔐 Part 2: Configure Domain (Optional but Recommended)

If you have a domain name:

### Step 1: Add DNS Records

In your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

1. Add an **A Record**:
   - **Host:** `@` (or your subdomain like `chat`)
   - **Value:** Your droplet IP address
   - **TTL:** 300 (5 minutes)

2. Wait 5-30 minutes for DNS propagation

### Step 2: Verify DNS

```bash
nslookup yourdomain.com
```

Should return your droplet IP.

---

## 🛠️ Part 3: Initial Server Setup

### Step 1: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 2: Run Setup Script

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deployment/scripts/setup.sh -o setup.sh
sudo bash setup.sh
```

**What this script does:**
1. ✅ Updates system packages
2. ✅ Installs Docker & Docker Compose
3. ✅ Configures firewall (allows ports 80, 443, 22)
4. ✅ Creates application directory
5. ✅ Guides you through SSH key setup
6. ✅ Clones your repository
7. ✅ Sets up environment variables
8. ✅ Requests SSL certificates
9. ✅ Builds and starts all services

**Important:** The setup script is designed for initial deployment on a fresh droplet. If you need to re-run SSL certificate setup, use the certbot renewal workflow instead of re-running the entire script.

### Step 3: Follow the Prompts

The script will ask you for:

1. **GitHub SSH Key Setup:**
   - Generate key: `ssh-keygen -t ed25519 -C "digitalocean-droplet"`
   - View public key: `cat ~/.ssh/id_ed25519.pub`
   - Add to GitHub: [Settings → SSH Keys](https://github.com/settings/keys)

2. **Repository URL** (SSH format):
   ```
   git@github.com:YOUR_USERNAME/YOUR_REPO.git
   ```

3. **Environment Variables** (edit `.env` file):
   - Database password (create a strong one!)
   - OpenAI API key
   - Groq API key
   - Admin password

4. **Domain & Email** (for SSL certificates):
   - Domain: `yourdomain.com`
   - Email: `your-email@example.com`

---

## ⚙️ Part 4: Configuration Details

### Environment Variables

Edit `/opt/uk-tax-advisor/app/deployment/.env`:

```bash
nano /opt/uk-tax-advisor/app/deployment/.env
```

Example configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD_HERE@db:5432/uk_tax_advisor
POSTGRES_DB=uk_tax_advisor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE

# OpenAI Configuration
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-YOUR_KEY_HERE

# Groq Configuration
GROQ_API_KEY=gsk_YOUR_KEY_HERE

# Admin Dashboard Password
ADMIN_PASSWORD=MKS2005

# Domain Configuration
DOMAIN_NAME=yourdomain.com
EMAIL=your-email@example.com
```

**Security Tips:**
- Use a strong database password (20+ characters, random)
- Never commit `.env` file to GitHub (already in `.gitignore`)
- Keep API keys secure

---

## 🧪 Part 5: Testing & Verification

### Step 1: Check Service Status

```bash
cd /opt/uk-tax-advisor/app/deployment
docker compose ps
```

Should show all services running:
- ✅ uk-tax-advisor-app
- ✅ uk-tax-advisor-wav2lip
- ✅ uk-tax-advisor-db
- ✅ uk-tax-advisor-nginx

### Step 2: View Logs

```bash
# View all logs
./scripts/logs.sh

# View specific service
./scripts/logs.sh app
./scripts/logs.sh wav2lip
```

### Step 3: Test Health Endpoints

```bash
# Main app health
curl https://yourdomain.com/health

# Wav2Lip service health
curl https://yourdomain.com/api/wav2lip/health
```

Should return JSON with `"status": "ok"` and `"inference_ready": true`.

### Step 4: Test the Application

1. Visit: `https://yourdomain.com`
2. Enter password: `MKS2005`
3. Ask a UK tax question (e.g., "What is the Personal Allowance?")
4. Verify:
   - ✅ Chat interface loads
   - ✅ AI responds with UK tax information
   - ✅ Avatars appear
   - ✅ Lip-sync video plays with realistic mouth movements
   - ✅ Audio synchronized with lip movements

---

## 🔄 Part 6: Deployment & Updates

### Update Your Application

When you push code changes to GitHub:

```bash
ssh root@YOUR_DROPLET_IP
cd /opt/uk-tax-advisor/app/deployment
./scripts/deploy.sh
```

This will:
1. Pull latest code from GitHub
2. Rebuild Docker containers
3. Restart services with zero-downtime
4. Clean up old images

### Backup Database

**Create backup:**
```bash
./scripts/backup.sh
```

Backups stored in `/opt/uk-tax-advisor/backups/`

**Restore from backup:**
```bash
./scripts/restore.sh /opt/uk-tax-advisor/backups/db_backup_TIMESTAMP.sql.gz
```

---

## 📊 Part 7: Monitoring & Maintenance

### View Logs

```bash
# All services (real-time)
./scripts/logs.sh

# Specific service
./scripts/logs.sh app 100  # Last 100 lines

# Just errors
docker compose logs | grep ERROR
```

### Check Resource Usage

```bash
# CPU & memory
docker stats

# Disk space
df -h

# Docker disk usage
docker system df
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart app
docker compose restart wav2lip
```

### SSL Certificate Renewal

Certificates auto-renew via certbot. To manually renew:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

---

## 🔧 Part 8: Troubleshooting

### Problem: Services Won't Start

**Check logs:**
```bash
docker compose logs app
docker compose logs wav2lip
```

**Common fixes:**
```bash
# Rebuild containers
docker compose build --no-cache
docker compose up -d

# Check environment variables
cat .env
```

### Problem: Out of Memory (Wav2Lip)

The Wav2Lip service needs 2GB+ RAM. If using a smaller droplet:

**Option 1:** Upgrade droplet to 8GB RAM

**Option 2:** Add swap space (temporary fix):
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Problem: SSL Certificate Errors

**Check certificate status:**
```bash
docker compose run --rm certbot certificates
```

**Re-request certificate:**
```bash
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com \
  --email your-email@example.com \
  --agree-tos --force-renewal
```

### Problem: Port Already in Use

```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service (e.g., Apache)
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Problem: Can't Connect to Database

**Check database is running:**
```bash
docker compose ps db
```

**Test database connection:**
```bash
docker compose exec db psql -U postgres -d uk_tax_advisor -c "SELECT 1;"
```

**Reset database:**
```bash
docker compose down
docker volume rm deployment_postgres-data
docker compose up -d
```

---

## 🔐 Part 9: Security Best Practices

### 1. Change Default Passwords

Edit `.env` and change:
- `ADMIN_PASSWORD` (for admin dashboard)
- `POSTGRES_PASSWORD` (for database)

Then restart:
```bash
docker compose up -d
```

### 2. Set Up Firewall Rules

Already configured by setup script, but verify:

```bash
sudo ufw status

# Should show:
# 22/tcp  ALLOW  (SSH)
# 80/tcp  ALLOW  (HTTP)
# 443/tcp ALLOW  (HTTPS)
```

### 3. Disable Root SSH Login

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change to:
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

**⚠️ Important:** Create a non-root user first!

### 4. Enable Automatic Security Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5. Monitor Failed Login Attempts

```bash
# Install fail2ban
sudo apt install fail2ban

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📈 Part 10: Scaling & Optimization

### Enable Docker Logging Limits

Prevent logs from filling disk:

```bash
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
docker compose up -d
```

### Add Caching for Wav2Lip

To reduce processing time for repeated requests, consider adding Redis caching (future enhancement).

### Upgrade Droplet

If you need more resources:

1. DigitalOcean Dashboard → Your Droplet
2. Click **"Resize"**
3. Choose larger plan (can scale up but not down!)
4. Click **"Resize Droplet"**

---

## 🎯 Success Checklist

- [ ] Droplet created and accessible via SSH
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned successfully
- [ ] Environment variables configured
- [ ] SSL certificates generated (if using domain)
- [ ] All services running (`docker compose ps` shows healthy)
- [ ] Health endpoints return success
- [ ] Application loads in browser
- [ ] Password authentication works
- [ ] AI chat responses working
- [ ] Lip-sync video generation working
- [ ] Analytics dashboard accessible (/admin)
- [ ] Automatic backups set up (optional)
- [ ] Monitoring configured (optional)

---

## 🆘 Getting Help

### View System Information

```bash
# Service status
docker compose ps

# Recent logs
docker compose logs --tail=50

# System resources
docker stats
df -h
free -h

# Network connectivity
curl -I https://api.openai.com
curl -I https://api.groq.com
```

### Useful Commands Reference

```bash
# Service management
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose restart        # Restart all services
docker compose ps             # View service status

# Logs
./scripts/logs.sh             # View all logs
./scripts/logs.sh app 100     # View app logs (last 100 lines)

# Deployment
./scripts/deploy.sh           # Update from GitHub
./scripts/backup.sh           # Backup database
./scripts/restore.sh FILE     # Restore database

# Maintenance
docker system prune -a        # Clean up unused Docker resources
docker compose pull           # Update base images
docker compose build --no-cache  # Rebuild from scratch
```

---

## 🎉 Next Steps

Once your application is live:

1. **Test thoroughly** - Try all features, multiple UK tax scenarios
2. **Monitor costs** - Check DigitalOcean billing dashboard
3. **Set up monitoring** - Consider tools like Uptime Robot for availability alerts
4. **Create backups** - Schedule regular database backups (cron job)
5. **Plan for scale** - If traffic grows, consider load balancing

---

## 📚 Additional Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

**Congratulations! Your UK Tax & Finance Advisor is now live with self-hosted Wav2Lip lip-sync!** 🎉
