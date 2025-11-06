# Render.com Deployment Guide

This guide will help you deploy the UK Tax & Finance Advisor application with full Wav2Lip lip-sync functionality to Render.com.

## Overview

You'll deploy **two services**:
1. **Main Application** (Node.js) - Chatbot frontend + backend with OpenAI integration
2. **Wav2Lip Service** (Python/Flask) - Self-hosted lip-sync video generation

---

## Prerequisites

Before you begin:
- [ ] GitHub account
- [ ] Render.com account (free tier available)
- [ ] Your code pushed to GitHub repository
- [ ] OpenAI API credentials (from Replit Secrets)

---

## Part 1: Push to GitHub

### Step 1: Remove Git Lock (if needed)

If you see a git lock error, run in the Replit Shell:
```bash
rm .git/index.lock
```

### Step 2: Sync with GitHub

1. Use Replit's Git interface or run:
```bash
git add .
git commit -m "Prepare for Render.com deployment"
git push origin main
```

**Note**: The `.gitignore` file now excludes the large model files (113MB), so your push should succeed.

---

## Part 2: Deploy Main Application

### Step 1: Create Web Service

1. Go to [render.com](https://render.com) and log in
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"** and authorize GitHub
4. Select your repository

### Step 2: Configure Main App

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `uk-tax-advisor` (or your choice) |
| **Environment** | `Node` |
| **Region** | `Frankfurt` (closest to UK) or your preference |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm run dev` |
| **Instance Type** | `Starter` ($7/month) or `Free` |

### Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value | Where to Find |
|-----|-------|---------------|
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | (from Replit) | Replit Secrets tab |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | (from Replit) | Replit Secrets tab |
| `NODE_ENV` | `production` | - |
| `VITE_WAV2LIP_SERVICE_URL` | *(leave empty for now)* | Will update after Step 2 |

**To find Replit secrets**:
1. In your Replit project, click the lock icon (🔒) in left sidebar
2. Click "Secrets" tab
3. Copy the values for OpenAI credentials

### Step 4: Deploy Main App

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for build to complete
3. Your app will be live at: `https://uk-tax-advisor.onrender.com`

**Note**: The app will work with Web Speech API voices while you set up Wav2Lip.

---

## Part 3: Deploy Wav2Lip Service

### Step 1: Create Dockerfile Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select the **same repository**
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `wav2lip-service` |
| **Environment** | `Docker` |
| **Region** | **Same as main app** (important!) |
| **Dockerfile Path** | `server/wav2lip_service/Dockerfile` |
| **Instance Type** | `Starter` ($7/month) minimum |

### Step 2: Set Docker Command

In **Advanced** settings:
- **Docker Build Context Directory**: `server/wav2lip_service`

### Step 3: Deploy Wav2Lip Service

1. Click **"Create Web Service"**
2. Wait 8-12 minutes (downloads models during build)
3. Your service will be at: `https://wav2lip-service.onrender.com`

### Step 4: Verify Wav2Lip Health

1. Visit: `https://wav2lip-service.onrender.com/health`
2. You should see JSON with `"inference_ready": true`

---

## Part 4: Connect the Services

### Update Main App Environment Variable

1. Go to your **Main App** dashboard on Render
2. Click **"Environment"** tab
3. Find `VITE_WAV2LIP_SERVICE_URL`
4. Set value to: `https://wav2lip-service.onrender.com`
5. Click **"Save Changes"**
6. Render will automatically redeploy

---

## Part 5: Testing

### Test Main Application

1. Visit your main app URL: `https://uk-tax-advisor.onrender.com`
2. Enter password: `MKS2005`
3. Ask a UK tax question (e.g., "What is the Personal Allowance?")
4. You should see:
   - ✅ Chat bubbles appearing
   - ✅ AI response
   - ✅ Avatars visible

### Test Lip-Sync (Full Feature)

1. After receiving AI response, avatars should:
   - ✅ Show lip-synced video (mouths moving realistically)
   - ✅ Alternate between Consultant and Partner
   - ✅ Play audio synchronized with lip movements

**If lip-sync doesn't work**:
- Check Wav2Lip service logs in Render dashboard
- Verify `VITE_WAV2LIP_SERVICE_URL` is set correctly
- Check browser console for errors (F12 → Console tab)
- The app will gracefully fall back to Web Speech API

---

## Cost Breakdown

### Option A: Basic (Web Speech API only)
- Main App: $7/month (Starter) or $0 (Free with spin-down)
- **Total: $7/month or Free**

### Option B: Full Lip-Sync (Recommended)
- Main App: $7/month
- Wav2Lip Service: $7-25/month (Starter to Standard)
- **Total: $14-32/month**

**Why deploy Wav2Lip?**
- Self-hosted = unlimited videos for flat rate
- Third-party APIs would cost $0.15/video = $750/month for 5,000 videos
- **You save $720/month** by self-hosting

---

## Custom Domain (Optional)

To use your own domain:

1. In Render dashboard, click your web service
2. Go to **"Settings"** → **"Custom Domain"**
3. Add your domain (e.g., `uktaxadvisor.com`)
4. Update your DNS provider with Render's CNAME record

---

## Troubleshooting

### Main App Issues

**Problem**: App won't start
- Check environment variables are set correctly
- Verify Node.js build succeeded in logs
- Check for missing dependencies

**Problem**: AI not responding
- Verify OpenAI credentials are correct
- Check rate limits (20 req/min per IP)
- View logs for API errors

### Wav2Lip Issues

**Problem**: Models not downloading
- Check Docker build logs
- Verify wget commands succeeded
- May need to increase build timeout

**Problem**: Lip-sync fails, falls back to Web Speech
- Check Wav2Lip service health endpoint
- Verify CORS is enabled (already configured in `app.py`)
- Check browser console for fetch errors

**Problem**: "OpenVINO compilation failed"
- This is expected on first run (models convert)
- Check service logs for completion
- Restart service if stuck

**Problem**: Service is slow
- Upgrade to Standard instance ($25/month)
- Each video takes 3-5 seconds to generate
- Consider implementing caching (future enhancement)

---

## Monitoring

### View Logs

**Main App**:
1. Render Dashboard → Main App → **"Logs"**
2. See real-time Express server output

**Wav2Lip Service**:
1. Render Dashboard → Wav2Lip Service → **"Logs"**
2. See Flask server + OpenVINO inference logs

### Metrics

- View CPU/Memory usage in **"Metrics"** tab
- Monitor request counts
- Check for errors or timeouts

---

## Scaling

If you get high traffic:

1. **Main App**: Upgrade to Professional ($25/mo) for horizontal scaling
2. **Wav2Lip**: Upgrade to Standard+ ($85/mo) for 4 GB RAM + faster CPU
3. **Optional**: Add caching layer (Redis) for frequently generated videos

---

## Security Notes

- Password (`MKS2005`) is client-side only - consider server-side auth for production
- API keys stored as environment variables (secure)
- HTTPS enabled automatically by Render
- Consider rate limiting on Wav2Lip endpoint if public

---

## Next Steps After Deployment

1. **Test thoroughly**: Try various UK tax questions
2. **Monitor costs**: Check Render billing dashboard
3. **Add features**:
   - Video caching to reduce processing
   - User authentication
   - Conversation history persistence
   - Export chat as PDF

---

## Support

If you encounter issues:

1. Check Render docs: https://render.com/docs
2. View service logs in Render dashboard
3. Check browser console (F12) for frontend errors
4. Verify all environment variables are set

---

## Success Checklist

- [x] `.gitignore` excludes large model files
- [ ] Code pushed to GitHub successfully
- [ ] Main app deployed and accessible
- [ ] Wav2Lip service deployed and healthy
- [ ] Environment variables configured correctly
- [ ] Services can communicate (CORS working)
- [ ] Lip-sync working or graceful fallback active
- [ ] Password protection working
- [ ] AI responses accurate and UK-focused

**Congratulations!** Your UK Tax & Finance Advisor is now live with self-hosted lip-sync! 🎉
