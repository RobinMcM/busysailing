# Deploy Wav2Lip Fix to Production

## What Was Fixed

✅ **Problem 1: Wav2Lip API not reachable**
- Added nginx reverse proxy for `/api/wav2lip/*` → `wav2lip:5001`
- Fixed URL rewriting to properly forward requests

✅ **Problem 2: Video format error**
- Fixed double-wrapping of video data URL
- Videos now play correctly as MP4 format

✅ **Verified locally:**
- CSS bundle builds correctly (72 KB)
- Avatar images bundle correctly (1.3-1.4 MB each)
- All assets in `dist/public/assets/`

## Simple Deployment Steps

Run these commands on your **DigitalOcean server**:

```bash
# 1. Navigate to project directory
cd /opt/uk-tax-advisor/app

# 2. Pull latest code with all fixes
git pull

# 3. Rebuild app container (includes fixed frontend)
cd deployment
docker compose build app

# 4. Restart app container
docker compose up -d app

# 5. Wait 10 seconds for container to fully start
sleep 10

# 6. Verify all services are healthy
docker compose ps
```

Expected output - all should show "Up" or "Up (healthy)":
```
uk-tax-advisor-app       Up
uk-tax-advisor-nginx     Up
uk-tax-advisor-wav2lip   Up (healthy)
```

## Test in Browser

1. **Open** https://busysailing.com
2. **Hard refresh** to clear cache:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. **Enter password**: `MKS2005`
4. **Send a test message**: "Can I claim home office expenses?"
5. **Watch for**:
   - ✅ Themed background (not white)
   - ✅ Two professional avatars visible
   - ✅ Lip-sync videos playing with speech
   - ✅ No console errors

## What You'll See

**First paragraph (~15-20 seconds):**
- AI generates response text
- OpenAI TTS creates audio
- Wav2Lip generates lip-sync video
- Primary advisor avatar speaks with moving lips

**Subsequent paragraphs:**
- Alternates between two advisors
- Each paragraph gets its own lip-sync video
- Smooth transitions between speakers

## Performance Notes

**Expected timing per paragraph:**
- Short (5-10 words): ~5-10 seconds
- Medium (20-30 words): ~15-20 seconds
- Long (50+ words): ~30-40 seconds

This is normal for CPU-based video generation. The Wav2Lip service processes each frame to sync lips with audio.

## Troubleshooting

### Still seeing old UI?

**Clear browser cache more aggressively:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check "Disable cache"
4. Right-click refresh button → "Empty Cache and Hard Reload"

### Verify assets are loading:

Check Network tab for these files (all should be HTTP 200):
```
✅ /assets/index-*.css  
✅ /assets/index-*.js
✅ /assets/Video_call_tax_advisor_*-*.png
✅ /assets/Older_European_female_advisor_*-*.png
```

### Still broken after hard refresh?

Check server logs for errors:
```bash
docker compose logs app --tail 100
docker compose logs nginx --tail 50
docker compose logs wav2lip --tail 50
```

## Success Checklist

After deployment, verify:

- ✅ Git pull completed without errors
- ✅ Docker build completed successfully
- ✅ All containers show "Up" status
- ✅ Browser shows themed interface (not white)
- ✅ Both advisor avatars are visible
- ✅ Lip-sync videos play when AI responds
- ✅ No 404 errors in browser console
- ✅ No console errors about "localhost:5001"

## Next Steps

Once working, consider:

1. **Optimize performance** - Upgrade to 6-8 vCPU droplet for faster video generation
2. **Change passwords** - Update `CHAT_PASSWORD` and `ADMIN_PASSWORD` in `.env`
3. **Monitor costs** - Check `/admin` dashboard for API usage and costs
4. **Backup database** - Set up automated backups (see DEPLOYMENT_STEPS.md)

---

**Need help?** Check the detailed troubleshooting in `FIX_UI_ISSUES.md`
