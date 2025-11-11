# Fix Wav2Lip Lip-Sync on Production

## Problems Fixed
1. ❌ Frontend was trying to connect to `localhost:5001` (no nginx reverse proxy)
2. ❌ Video format was double-wrapped with wrong MIME type causing playback errors

## Solutions
1. ✅ Added nginx reverse proxy for `/api/wav2lip/*` → `wav2lip:5001`
2. ✅ Fixed frontend to use server-provided video data URL directly (MP4 format)

## Deployment Steps

### 1. SSH into your DigitalOcean droplet

```bash
ssh root@busysailing.com
```

### 2. Pull the latest code

```bash
cd /opt/uk-tax-advisor/app
git pull
```

### 3. Rebuild the app container with updated frontend

```bash
cd deployment
docker compose build app
docker compose up -d app
```

This rebuilds the frontend with:
- Fixed video format handling (no more double-wrapping)
- Correct video MIME type (MP4 instead of WebM)

### 4. Verify all services are running

```bash
docker compose ps
```

All containers should show "Up" or "Up (healthy)".

### 5. Test the Wav2Lip service

```bash
# Test that nginx can reach the wav2lip container
curl -i https://busysailing.com/api/wav2lip/health
```

Expected response:
```
HTTP/2 200
content-type: application/json

{"status":"ok","models_available":true}
```

### 6. Test the full application

1. Visit https://busysailing.com in your browser
2. Enter the password: `MKS2005`
3. Type a message and send it
4. Watch for the lip-sync video to generate (the avatars should move their lips in sync with the speech)

## What Changed

### nginx.conf
Added a new location block that proxies Wav2Lip requests:

```nginx
location /api/wav2lip/ {
    rewrite ^/api/wav2lip/(.*)$ /$1 break;
    proxy_pass http://wav2lip:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Extended timeouts for video generation
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    # Increase body size for video uploads
    client_max_body_size 50M;
}
```

This configuration:
- Strips `/api/wav2lip/` from the URL and forwards the rest to the wav2lip container
- Transforms `/api/wav2lip/api/generate` → `/api/generate` on the upstream
- Sets generous timeouts (300 seconds) for video generation
- Allows up to 50MB request body size for base64-encoded media

## Troubleshooting

### If you see "Failed to load resource: net::ERR_CONNECTION_REFUSED"

Check that nginx can reach the wav2lip container:
```bash
docker compose exec nginx curl http://wav2lip:5001/health
```

### If nginx fails to start

Check the configuration syntax:
```bash
docker compose exec nginx nginx -t
```

### If wav2lip container is not running

Check container status:
```bash
docker compose ps
```

Start if needed:
```bash
docker compose up -d wav2lip
```

## Verification Checklist

- ✅ nginx container restarted successfully
- ✅ No errors in nginx logs
- ✅ `/api/wav2lip/health` endpoint returns 200
- ✅ Lip-sync videos generate when chatting with the AI
- ✅ No "localhost:5001" errors in browser console

## Rollback (if needed)

If anything goes wrong, you can roll back to the previous nginx config:

```bash
cd /opt/uk-tax-advisor/app
git log --oneline -5  # Find the previous commit
git checkout <previous-commit-hash> deployment/nginx/nginx.conf
docker compose restart nginx
```
