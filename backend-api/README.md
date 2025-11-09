# BusySailing API

Backend API server for the UK Tax & Finance Advisor chatbot. Provides:
- 🤖 AI chat responses (Groq Llama 3.3 70B / OpenAI GPT-4o)
- 🔊 Text-to-Speech (OpenAI TTS)
- 🎥 Wav2Lip video generation (separate Flask service)
- 📊 Analytics and usage tracking

## Architecture

This backend is designed to be deployed separately from the frontend and can serve multiple frontend applications.

**Frontend**: Hosted on Replit (https://replit.com/@RobinMcM/finbotai)  
**Backend**: Deployed on DigitalOcean (busysailing.com)  
**Database**: PostgreSQL (Neon)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.template` to `.env` and fill in your credentials:
```bash
cp .env.template .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `GROQ_API_KEY` - Groq API key for chat
- `OPENAI_API_KEY` - OpenAI API key for TTS
- `ADMIN_PASSWORD` - Password for analytics dashboard

### 3. Push Database Schema
```bash
npm run db:push
```

### 4. Run Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Core Features
- `POST /api/verify-password` - Verify chat access password
- `POST /api/chat` - Send chat message and get AI response
- `POST /api/tts` - Generate text-to-speech audio
- `POST /api/wav2lip` - Generate lip-synced video (proxies to Flask service)

### Analytics
- `POST /api/admin/verify` - Verify admin password
- `GET /api/admin/analytics` - Get usage analytics

### Health Check
- `GET /health` - Server health status

## CORS Configuration

The server allows requests from:
- `https://busysailing.com`
- `*.replit.dev`
- `*.replit.app`
- `*.repl.co`

## Deployment

See the main repository's `deployment/` folder for DigitalOcean deployment instructions.

## Environment

- Node.js 20+
- TypeScript
- Express.js
- PostgreSQL (via Drizzle ORM)
- Groq SDK
- OpenAI SDK
