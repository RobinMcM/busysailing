# BusySailing API - Simplified Version

**No database required!** This version uses in-memory storage for quick setup.

## Quick Start

### 1. Add These Secrets Only

In Replit Secrets (press `Ctrl+K` → search "Secrets"):

```
GROQ_API_KEY=<your_groq_key>
OPENAI_API_KEY=<your_openai_key>
CHAT_PASSWORD=MKS2005
ADMIN_PASSWORD=MKS2005
```

### 2. Update package.json

Change the `dev` script to use the simple version:
```json
"dev": "NODE_ENV=development tsx --watch index-simple.ts",
```

### 3. Run

The server will start automatically on port 3000!

## What Works

✅ Password verification  
✅ AI chat (Groq/OpenAI)  
✅ Text-to-Speech  
✅ Analytics (in-memory)  
✅ Rate limiting  
✅ CORS for Replit domains  

## What's Different

- **No database** - Analytics stored in memory (lost on restart)
- **Simpler setup** - Only need API keys
- **Same functionality** - Chat and TTS work exactly the same

## Endpoints

- `POST /api/verify-password` - Check chat password
- `POST /api/chat` - Send chat message
- `POST /api/tts` - Generate speech
- `POST /api/admin/verify` - Check admin password
- `GET /api/analytics?period=today` - Get analytics
- `GET /health` - Health check

## Add Database Later

When ready, switch back to `index.ts` and add `DATABASE_URL` secret.
