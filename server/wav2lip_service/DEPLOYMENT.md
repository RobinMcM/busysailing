# Wav2Lip Service - Render Deployment Guide

This guide explains how to deploy the Wav2Lip Flask service to Render as a separate Docker-based web service.

## Prerequisites

- Render account (free tier works)
- Git repository with this code pushed

## Deployment Steps

### 1. Create New Web Service in Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Configure the service:

### 2. Service Configuration

**Basic Settings:**
- **Name:** `uk-tax-advisor-wav2lip` (or your preferred name)
- **Region:** Choose closest to your users (e.g., Oregon, Frankfurt)
- **Branch:** `main` (or your deployment branch)
- **Root Directory:** `server/wav2lip_service`
- **Environment:** `Docker`
- **Docker Build Context Directory:** `server/wav2lip_service`

**Dockerfile Configuration:**
- **Dockerfile Path:** `Dockerfile` (already in wav2lip_service directory)

**Instance Type:**
- **Recommended:** Standard 2GB RAM minimum (ML inference requires memory)
- Free tier may be too limited for OpenVINO models

### 3. Environment Variables

Add these in Render's Environment tab:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | Auto-assigned by Render | ✅ (automatic) |
| `FLASK_DEBUG` | `false` | ✅ |
| `PYTHONUNBUFFERED` | `1` | ✅ (already in Dockerfile) |

### 4. Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Build Docker image
   - Download Wav2Lip models (takes ~5 minutes)
   - Convert models to OpenVINO format
   - Start Flask service
3. Wait for deployment to complete (~10-15 minutes first time)

### 5. Verify Deployment

Once deployed, you'll get a URL like: `https://uk-tax-advisor-wav2lip.onrender.com`

Test the health endpoint:

```bash
curl https://your-service-url.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "wav2lip",
  "phase": "5",
  "openvino_ready": true,
  "models_available": true,
  "inference_ready": true,
  "capabilities": {
    "face_detection": true,
    "audio_preprocessing": true,
    "wav2lip_generation": true
  }
}
```

### 6. Connect Main App

After deployment, configure your main app (Node.js Express) to use the Wav2Lip service:

**In your main app's Render environment variables:**

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_WAV2LIP_SERVICE_URL` | Your deployed Flask service URL | `https://uk-tax-advisor-wav2lip.onrender.com` |

Then redeploy your main app for the environment variable to take effect.

## Testing the Service

### Test Health Endpoint

```bash
curl https://your-wav2lip-service.onrender.com/health
```

### Test Generation Endpoint

Use the included test script (requires test assets):

```bash
# From server/wav2lip_service directory
python test_api.py https://your-wav2lip-service.onrender.com
```

Or test manually with curl:

```bash
curl -X POST https://your-wav2lip-service.onrender.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_here",
    "audio": "base64_encoded_wav_here",
    "fps": 25
  }'
```

## Resource Requirements

**Minimum:**
- 2 GB RAM
- 1 vCPU
- 512 MB disk

**Recommended:**
- 4 GB RAM (for better performance)
- 2 vCPU (faster inference)
- 1 GB disk

## Cost Estimates

**Render Pricing (as of Nov 2024):**
- **Starter (512 MB RAM):** $7/month - NOT recommended for Wav2Lip
- **Standard (2 GB RAM):** $25/month - Minimum for production
- **Pro (4 GB RAM):** $85/month - Better performance

**Note:** Free tier sleeps after inactivity and has very limited resources. Not suitable for this service.

## Troubleshooting

### Build Fails

**Issue:** Docker build times out or fails
**Solution:** Check build logs. Model downloads can take time. Ensure Dockerfile paths are correct.

### OpenVINO Not Ready

**Issue:** Health check shows `openvino_ready: false`
**Solution:** Check logs for OpenVINO installation errors. Verify Python dependencies installed correctly.

### Models Not Available

**Issue:** Health check shows `models_available: false`
**Solution:** 
- Check that model downloads completed during build
- Verify `models/` directory contains: `face_detection.xml/bin` and `wav2lip.xml/bin`
- If missing, models need to be converted (see `convert_to_openvino.py`)

### Inference Fails

**Issue:** `/api/generate` returns errors
**Solution:**
- Check logs for specific error messages
- Verify image/audio base64 encoding is correct
- Test with smaller images first (~512x512 pixels)
- Ensure audio is WAV format

## Architecture

```
┌─────────────────────────────────────┐
│   Main App (Node.js/Express)        │
│   Port: 5000                         │
│   Handles: Chat, TTS, UI             │
└──────────────┬──────────────────────┘
               │
               │ HTTP Request
               │ POST /api/generate
               │ { image, audio, fps }
               │
┌──────────────▼──────────────────────┐
│   Wav2Lip Service (Flask/Python)    │
│   Port: Auto (Render-assigned)      │
│   Handles: Lip-sync video generation│
│                                      │
│   Dependencies:                      │
│   - OpenVINO (CPU inference)         │
│   - OpenCV (video encoding)          │
│   - Librosa (audio processing)       │
└─────────────────────────────────────┘
```

## Monitoring

### Health Checks

Render will automatically monitor the `/health` endpoint. Configure:

**Health Check Path:** `/health`
**Expected Status Code:** 200

### Logs

Access logs in Render dashboard:
- Build logs: Check Docker build process
- Runtime logs: Check Flask application logs
- Error logs: Debug inference issues

## Security

### CORS Configuration

Flask service has CORS enabled for all origins (development setup). For production:

1. Update `app.py` to restrict origins:
```python
CORS(app, origins=[
    "https://your-main-app.onrender.com",
    "https://your-custom-domain.com"
])
```

### API Authentication

Currently no authentication. For production, consider:
- API keys via headers
- JWT tokens
- IP whitelisting

## Performance Optimization

### Cold Start Mitigation

Render free/starter tiers sleep after inactivity. To reduce cold starts:
- Use paid tier (always-on)
- Implement keep-alive pings
- Pre-warm models on startup

### Caching

Consider caching:
- Face detection results (same avatar image)
- Audio preprocessing results
- Common request patterns

### Scaling

For high traffic:
- Enable autoscaling in Render
- Use load balancing
- Consider GPU instances for faster inference

## Next Steps

After deployment:
1. ✅ Verify health endpoint
2. ✅ Test with sample request
3. ✅ Configure main app environment variable
4. ✅ Redeploy main app
5. ✅ Test end-to-end lip-sync generation
6. ✅ Monitor performance and costs

## Support

For issues:
- Check Render logs first
- Review PHASE5_STATUS.md for implementation details
- Test locally with Docker to isolate Render-specific issues
