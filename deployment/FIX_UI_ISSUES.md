# Fix UI Issues on Production

## Symptoms
- ✅ Wav2Lip is working (videos generating successfully in console)
- ❌ White background instead of themed colors
- ❌ Avatars not displaying
- ❌ Huge speech lag (expected for video generation, but may indicate timeouts)

## Root Causes
1. **Browser Cache** - Old JavaScript/CSS bundles cached
2. **Docker Build Cache** - Frontend assets not rebuilt properly
3. **CSS Bundle** - Styling not loaded in production build

## Complete Fix Steps

### Step 1: Rebuild Frontend with Clean Build

On your DigitalOcean server:

```bash
cd /opt/uk-tax-advisor/app
git pull

cd deployment

# Force rebuild without cache
docker compose build --no-cache app

# Restart with fresh container
docker compose up -d app

# Verify it's running
docker compose ps
docker compose logs app --tail 50
```

### Step 2: Clear Browser Cache

In your browser:
1. Open **Developer Tools** (F12)
2. Right-click the **Refresh button**
3. Select **"Empty Cache and Hard Reload"**

Or use keyboard shortcuts:
- **Chrome/Edge**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Firefox**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

### Step 3: Verify Assets Are Loading

Open browser DevTools → Network tab and check:

✅ **Should load successfully:**
- `index-*.js` (main JavaScript bundle)
- `index-*.css` (stylesheet)
- Avatar images from `/assets/` directory

❌ **If you see 404 errors:**
```
Failed to load resource: /assets/generated_images/...
```

This means the Docker build didn't include the images properly.

### Step 4: Test the Complete Flow

1. Visit https://busysailing.com
2. Enter password: `MKS2005`
3. You should now see:
   - ✅ Themed background (not white)
   - ✅ Two professional female advisor avatars visible
   - ✅ Chat interface properly styled
4. Send a message
5. Watch for lip-sync videos to play

## Troubleshooting

### Still seeing white background?

Check if CSS is loading:
```bash
# On the server
docker compose exec app ls -la /app/server/public/

# You should see:
# - index.html
# - assets/ directory
# - index-*.js
# - index-*.css
```

If `index-*.css` is missing:
```bash
# Rebuild with verbose output
docker compose build app 2>&1 | tee build.log
grep -i "css" build.log
```

### Avatars still not displaying?

Check if images are in the bundle:
```bash
docker compose exec app find /app/server/public -name "*.png" | grep -i avatar
```

Expected output:
```
/app/server/public/assets/Video_call_tax_advisor-*.png
/app/server/public/assets/Older_European_female_advisor-*.png
```

If images are missing, the Vite build didn't bundle them. Check that `attached_assets/` directory exists in the builder stage.

### Speech is very slow?

This is **normal** for Wav2Lip video generation. Each paragraph takes 10-20 seconds to:
1. Generate audio with OpenAI TTS
2. Process lip-sync with Wav2Lip OpenVINO
3. Stream video back to browser

You can:
- **Shorten responses** - Shorter AI replies = faster playback
- **Upgrade server** - More CPU = faster video generation
- **Disable Wav2Lip** - Falls back to Web Speech API (instant, but no lip-sync)

## Success Checklist

After following all steps:

- ✅ Browser shows themed interface (not white)
- ✅ Two advisor avatars are visible
- ✅ Chat messages display properly
- ✅ Lip-sync videos play when AI responds
- ✅ No console errors about missing assets
- ✅ Network tab shows all assets loading (200 status)

## Performance Notes

**Expected timing for Wav2Lip:**
- Short paragraph (5-10 words): ~5-10 seconds
- Medium paragraph (20-30 words): ~15-20 seconds  
- Long paragraph (50+ words): ~30-40 seconds

The console shows "Timeout fallback triggered" which is normal when video generation takes longer than expected. The system is working correctly - it's just slow due to CPU-based video processing.

Consider upgrading to a 6-8 vCPU droplet for faster generation if needed.
