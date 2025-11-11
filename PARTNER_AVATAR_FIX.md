# Partner Avatar Fix - Deployment Guide

## What Was Fixed

The **Partner avatar** (second avatar) now properly displays after 2 AI responses. Previously, the avatar was conditionally rendered which caused timing issues. Now both avatars are always in the DOM with visibility controlled by CSS opacity transitions.

## Changes Made

### 1. Avatar Rendering Logic (`client/src/pages/chat.tsx`)
- **Before**: Partner avatar conditionally rendered with `{isSecondAvatarEnabled && ...}`
- **After**: Partner avatar always rendered, visibility controlled by opacity classes
- **Effect**: Smooth 500ms fade-in transition when Partner avatar activates

### 2. Debug Logging Added
Console logs now show:
```
[Avatar] AI response count: 1, Partner enabled: false
[Avatar] AI response count: 2, Partner enabled: false
[Avatar] Enabling Partner avatar
[Avatar] AI response count: 2, Partner enabled: true
```

### 3. Test IDs Updated
- `data-testid="avatar-support-container"` - Outer container controlling visibility
- `data-testid="avatar-support"` - Inner avatar canvas element

## Expected Behavior After Deployment

1. **User unlocks** with password "MKS2005"
2. **First message** → AI responds → Only **Consultant avatar** visible
3. **Second message** → AI responds → **Partner avatar fades in** (500ms transition)
4. **Both avatars** remain visible side-by-side

## How to Redeploy to Docker

### Quick Redeploy (Git-based)

If you have Git deployment set up:

```bash
# On your DigitalOcean droplet
cd /path/to/your/app
git pull origin main
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### Full Rebuild

If starting fresh:

```bash
# 1. Pull latest code
cd /path/to/your/app
git pull origin main

# 2. Rebuild Docker image (no cache to ensure latest code)
docker-compose build --no-cache

# 3. Restart services
docker-compose down
docker-compose up -d

# 4. Check logs
docker-compose logs -f app
```

### Verify Deployment

After redeploying, test the Partner avatar:

1. Open your app at `https://busysailing.com`
2. Enter password: `MKS2005`
3. Send 2 messages to the AI
4. **After 2nd AI response**: Partner avatar should fade in on the right side
5. Open browser console (F12) → Look for `[Avatar] Enabling Partner avatar` log

## Files Modified

- `client/src/pages/chat.tsx` - Partner avatar rendering logic + debug logs
- `PARTNER_AVATAR_FIX.md` - This deployment guide

## Troubleshooting

### Partner avatar still doesn't appear after redeployment

**Check 1**: Verify latest code is deployed
```bash
docker-compose exec app cat client/src/pages/chat.tsx | grep "avatar-support-container"
```
Should show: `data-testid="avatar-support-container"`

**Check 2**: Hard refresh browser
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- This clears cached JavaScript

**Check 3**: Check browser console
- Press F12 → Console tab
- Send 2 messages
- Look for `[Avatar] Enabling Partner avatar`
- If missing, code didn't update

**Check 4**: Verify AI response count
- Each user message should get 1 assistant response
- After 2 exchanges (4 total messages), Partner should appear

### WebGL Fallback Cards Showing Instead of 3D Avatars

This is expected in some browsers without WebGL support. The avatars will show as:
- Consultant: "3D Avatar Not Available" card
- Partner: Same fallback card

This doesn't affect functionality - voice and chat still work normally.

## Cost Impact

No cost changes. The 3D avatars render client-side (zero server overhead), whether one or both are visible.

## Support

If you need help with deployment:
1. Check Docker logs: `docker-compose logs app`
2. Verify environment variables are set (GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
3. Ensure port 5000 is accessible

---

**Summary**: Pull latest code → Rebuild Docker image → Restart → Test with 2 messages → Partner avatar should fade in! 🎉
