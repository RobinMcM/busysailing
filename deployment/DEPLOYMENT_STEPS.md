# Deployment Steps for New DigitalOcean Droplet

This guide walks you through deploying the UK Tax Advisor application on a fresh DigitalOcean droplet.

## Prerequisites

- DigitalOcean droplet with Ubuntu 22.04 (8GB RAM / 4 vCPU recommended)
- Domain DNS pointing to droplet IP address (e.g., busysailing.com → 68.183.34.27)
- SSH access to the droplet

## Step 1: Initial Setup (Already Completed)

If you haven't run the setup script yet:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/deployment/scripts/setup.sh | sudo bash
```

## Step 2: Rebuild with Fixed Dockerfile

The app Dockerfile has been fixed to include all necessary files. Rebuild the app container:

```bash
cd /opt/uk-tax-advisor/app
git pull
cd deployment
docker compose build app
```

## Step 3: Start Services (Bootstrap Mode)

Start all services using the bootstrap nginx config (HTTP only, no SSL):

```bash
docker compose up -d
```

Check that all services are running:

```bash
docker compose ps
```

You should see:
- ✅ uk-tax-advisor-app: Up
- ✅ uk-tax-advisor-wav2lip: Up (healthy)
- ✅ uk-tax-advisor-nginx: Up
- ✅ uk-tax-advisor-certbot: Up

## Step 4: Test HTTP Access

Visit your site via HTTP to verify it's working:

```bash
curl http://busysailing.com/health
```

Or open in browser: `http://busysailing.com`

## Step 5: Generate SSL Certificates

Once the site is accessible via HTTP, generate SSL certificates with certbot:

```bash
# Run certbot to obtain certificates
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d busysailing.com \
  -d www.busysailing.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

Verify certificates were created:

```bash
sudo ls -la /opt/uk-tax-advisor/app/deployment/certbot/conf/live/busysailing.com/
```

You should see:
- fullchain.pem
- privkey.pem
- chain.pem
- cert.pem

## Step 6: Switch to Full SSL Config

Now that certificates exist, switch nginx to use the full SSL config:

```bash
# Edit docker-compose.yml
cd /opt/uk-tax-advisor/app/deployment
nano docker-compose.yml
```

Find the nginx volumes section and change:

```yaml
# FROM (bootstrap):
- ./nginx/nginx-bootstrap.conf:/etc/nginx/nginx.conf:ro

# TO (full SSL):
- ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

Save and exit (Ctrl+X, Y, Enter).

## Step 7: Restart Nginx with SSL

Restart nginx to load the full SSL configuration:

```bash
docker compose restart nginx
```

Check nginx logs to ensure it started successfully:

```bash
docker compose logs nginx -f
```

You should see:
- ✅ No certificate errors
- ✅ "Configuration complete; ready for start up"

## Step 8: Verify HTTPS Access

Test HTTPS access:

```bash
curl https://busysailing.com/health
```

Or open in browser: `https://busysailing.com`

You should be automatically redirected from HTTP to HTTPS.

## Step 9: Test All Features

1. **Main Application**: Visit https://busysailing.com
2. **Password Gate**: Enter password `MKS2005`
3. **Chat**: Send a test message about UK taxes
4. **Admin Dashboard**: Visit https://busysailing.com/admin (password: `MKS2005`)
5. **Wav2Lip**: Test lip-sync video generation if UI supports it

## Troubleshooting

### App container keeps restarting

Check logs:
```bash
docker compose logs app --tail=50
```

Common issues:
- Missing environment variables in `.env` file
- Database connection issues

### Nginx certificate errors

If you see "cannot load certificate" errors:
- Ensure you're using `nginx-bootstrap.conf` until certificates are generated
- Verify certbot successfully created certificates
- Check file permissions: `sudo ls -la /opt/uk-tax-advisor/app/deployment/certbot/conf/live/`

### Wav2Lip service unhealthy

Check logs:
```bash
docker compose logs wav2lip --tail=50
```

Verify health:
```bash
curl http://localhost:5001/health
```

### DNS not resolving

Verify DNS propagation:
```bash
nslookup busysailing.com
```

Should show your droplet IP (68.183.34.27).

## Maintenance

### View all container logs

```bash
cd /opt/uk-tax-advisor/app/deployment
docker compose logs -f
```

### Restart all services

```bash
docker compose restart
```

### Update application code

```bash
cd /opt/uk-tax-advisor/app
git pull
cd deployment
docker compose build
docker compose up -d
```

### Update nginx configuration only

If you've updated only the nginx configuration (like adding new proxy routes):

```bash
cd /opt/uk-tax-advisor/app
git pull
cd deployment

# Restart nginx to reload configuration
docker compose restart nginx

# Verify nginx is running correctly
docker compose logs nginx --tail 50
```

### SSL certificate renewal

Certbot automatically renews certificates every 12 hours (handled by certbot container).

To manually renew:
```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

## Security Notes

- Default passwords are `MKS2005` for both chat and admin access
- Change these in the `.env` file:
  ```
  CHAT_PASSWORD=your-secure-password
  ADMIN_PASSWORD=your-admin-password
  ```
- Firewall (ufw) is configured to allow only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS)
- All services run in isolated Docker network

## Success Checklist

- ✅ All containers running and healthy
- ✅ HTTP redirects to HTTPS
- ✅ SSL certificates valid (check in browser)
- ✅ Chat application accessible
- ✅ Admin dashboard accessible
- ✅ Wav2Lip health endpoint returns 200
- ✅ No errors in container logs
