# Deploying Realistic Avatars to Production

## Overview
This guide explains how to deploy the realistic 3D avatar upgrade to your production server at busysailing.com.

## What's New
- **Realistic 3D faces** with professional features (eyes, nose, lips, hair)
- **Advanced animations**: Phoneme-based lip-sync, blinking, eye tracking
- **Professional fallback**: High-quality static portraits when WebGL unavailable
- **Optimized for stability**: Reduced polygon counts, WebGL context loss handling

## Critical: Deployment Sequence

**YOU MUST follow these steps in order:**

```bash
# 1. SSH into your production server
ssh root@your-server-ip

# 2. Navigate to application directory
cd /opt/uk-tax-advisor/app

# 3. PULL LATEST CODE FROM GITHUB FIRST (CRITICAL!)
git pull origin main

# 4. Verify you have the latest commit
git log --oneline -1
# Should show: "Improve 3D avatars with realistic faces and advanced animations"
# Or a more recent commit about realistic avatars

# 5. Navigate to deployment folder
cd deployment

# 6. Stop existing containers
docker compose down

# 7. Build with --no-cache to force fresh build
docker compose build --no-cache

# 8. Start containers
docker compose up -d

# 9. Watch logs to verify startup
docker compose logs -f app
# Press Ctrl+C to exit logs once you see "serving on port 5000"

# 10. Verify all containers are running
docker compose ps
# Should show: app, nginx (if configured), and wav2lip (optional)

# 11. Test the site
curl -I https://busysailing.com/
# Should show: HTTP/2 200

# 12. Open in browser and test avatars
# Go to https://busysailing.com
# Enter access code: MKS2005
# Send a message and verify avatars appear
```

## Important Notes

### Why `git pull` MUST Come First
Docker builds from your local working directory (`context: ..` in docker-compose.yml).
If you don't `git pull` first, Docker will build with **old code**, even after running `build --no-cache`.

### WebGL Fallback
If WebGL is not available or crashes, users will see professional static portraits instead of 3D avatars.
This ensures the application always looks professional, even on devices without GPU support.

### Avatar Features
**When WebGL works:**
- Semi-realistic 3D professional faces
- Animated lip-sync during speech
- Natural blinking and eye movements
- Blue glow when speaking

**When WebGL unavailable:**
- Professional business portrait photographs
- Consultant and Partner have distinct appearances

## Troubleshooting

### Problem: Still seeing old geometric avatars

**Solution:**
1. Did you run `git pull origin main` BEFORE building?
2. Check git log to verify you have latest code
3. Rebuild with `--no-cache` flag
4. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Problem: "THREE.WebGLRenderer: Context Lost" in browser console

**Solution:**
This is handled automatically. The app will show professional static images as fallback.
WebGL context loss is common on low-power devices and is now handled gracefully.

### Problem: Avatars don't appear at all

**Check:**
1. Browser console for errors (F12)
2. Docker logs: `docker compose logs app`
3. Network tab in browser to verify assets loading
4. Try incognito/private browsing to rule out cache

### Problem: "Row violates row-level security policy" in server logs

**Solution:**
This occurs when analytics tracking fails due to missing Supabase RLS policies.

1. Log into your Supabase project dashboard
2. Go to SQL Editor
3. Run the SQL from `deployment/supabase-schema.sql`
4. This creates the analytics table with proper RLS policies
5. Restart the app: `docker compose restart app`

**Note:** Chat and avatars work fine even without analytics. This only affects usage tracking.

### Problem: "synthesis-failed" or TTS warnings in browser console

**Solution:**
This is expected behavior when OpenAI TTS fails or is unavailable.
The app automatically falls back to browser's built-in speech synthesis.

**Expected warnings:**
- "No voice selected, will use browser default"
- Speech synthesis errors

These don't affect functionality - the fallback chain ensures TTS always works.

## Verification Checklist

✅ Latest code pulled from GitHub  
✅ Docker rebuild completed successfully  
✅ All containers running (docker compose ps)  
✅ Site accessible at https://busysailing.com  
✅ Can enter access code and see chat interface  
✅ Avatars appear (either 3D or professional fallback)  
✅ Partner avatar appears after 2nd AI response  
✅ TTS voice works and avatars react to speech  

## Need Help?

If issues persist:
1. Check docker logs: `docker compose logs app | tail -100`
2. Check browser console for errors
3. Verify environment variables are set correctly (.env file)
4. Ensure Supabase credentials are correct

## Optional: Remove Wav2Lip Container

The wav2lip container is no longer needed (avatars now use client-side Three.js).
You can optionally remove it from docker-compose.yml to save resources.
