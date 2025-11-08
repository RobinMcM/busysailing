# UK Tax & Finance Advisor AI Chatbot

## Overview
This project is an AI-powered chatbot designed to provide expert guidance on UK taxes, HMRC regulations, accounting, and UK personal finance. Its primary purpose is to offer intelligent conversational assistance for a wide range of UK financial queries, including Self Assessment, ISAs, SIPPs, National Insurance, VAT, Corporation Tax, and UK business structures. The project aims to deliver accurate, UK-specific financial information through a user-friendly interface with advanced features like dual avatars and voice interaction.

## User Preferences
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture
The application features a React/TypeScript frontend with Shadcn UI and Tailwind CSS, and an Express.js backend. Core architectural decisions include a dual AI integration strategy, prioritizing Groq (Llama 3.3) for chat responses due to its speed and cost-effectiveness, and OpenAI TTS for high-quality voice generation. A key feature is the Wav2Lip lip-sync integration, utilizing a self-hosted Flask API with OpenVINO for efficient, CPU-based video generation. The UI/UX emphasizes a mobile-first, WhatsApp-style chat display with dual professional avatars, visual dimming for inactive speakers, and paragraph-based voice alternation using distinct British English female voices. The system incorporates a password gate for access control, rate limiting, and robust error handling. Conversation context is maintained for multi-turn interactions, and all content is localized for the UK.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for state management, Shadcn UI, Tailwind CSS.
- **Backend**: Express.js, PostgreSQL database (Neon/Drizzle ORM), rate limiting (20 req/min/IP).
- **AI Integration**: Primary: Groq API (Llama 3.3 70B Versatile); Fallback: OpenAI GPT-4o or Replit AI Integrations. System prompt tailored for UK tax law.
- **Wav2Lip Integration**: Flask API service with OpenVINO-based Wav2Lip inference. Models converted to OpenVINO IR format (113MB, hosted on HuggingFace: RobinMcM/wav2lip-openvino-models). Models are baked into Docker image during build. Supports FPS-synchronized audio processing and promise-based sequential execution. Graceful fallback to Web Speech API.
- **User Interface**: Mobile-phone-styled chat history, dual independent avatars with visual dimming, auto-scroll, timestamps, and professional UK financial services-themed styling.
- **Voice Features**: Speech-to-text (Web Speech API), dual text-to-speech with paragraph-based voice alternation (Consultant/Partner voices), mute/unmute, and stop speaking controls.
- **Security**: Password gate (MKS2005) for chat access; backend-verified admin authentication for analytics dashboard.
- **Analytics System**: Comprehensive usage tracking with PostgreSQL persistence. Tracks chat/TTS requests, token/character counts, costs, IP addresses, response times. Admin dashboard at /admin with real-time metrics, 100-user cost projections, period filtering, and CSV export.

### Feature Specifications
- **Password Gate**: 12-character obscured input, visual feedback (lock icon), disables functionality until correct.
- **Layout**: Side-by-side on desktop, stacked on mobile, with mobile phone container (307px width).
- **Chat Display**: WhatsApp-style, user messages (green, right), AI messages (grey, left), auto-scroll.
- **Avatars**: Two female professional avatars (Consultant always visible, Partner enabled after 2nd AI response or when speaking), visual dimming (50% opacity) for inactive speaker.
- **Voice Alternation**: Paragraph-based (Consultant: even paragraphs, higher pitch; Partner: odd paragraphs, lower pitch), 400ms pause, British English voices, Web Speech API fallback.
- **Loading Feedback**: Typing indicator during AI response generation.
- **Error Handling**: User-friendly error messages.
- **Disclaimer**: Reminder to consult UK-qualified professionals.

## External Dependencies
- **Groq API**: For fast and cost-effective AI chat responses (Llama 3.3 70B Versatile).
- **OpenAI API**: For high-quality Text-to-Speech (TTS) voices (GPT-4o for chat fallback, primary for TTS).
- **Replit AI Integrations**: As a fallback for both chat and TTS.
- **Web Speech API**: For client-side Speech-to-Text and as a fallback for Text-to-Speech/Wav2Lip.
- **OpenVINO**: Used in the Wav2Lip Flask service for optimized, CPU-based model inference.

## Deployment Configuration

### Recommended: DigitalOcean Deployment
The application can be deployed to a single DigitalOcean droplet (8GB RAM / 4 vCPU / 160GB SSD) running all services via Docker Compose. This is the most cost-effective option at ~$48-63/month for complete hosting.

**Deployment Structure:**
- **Docker Compose Setup**: All services (Node.js app, Flask Wav2Lip, PostgreSQL, Nginx) run in containers on one server
- **Nginx Reverse Proxy**: Handles SSL termination, routing, and rate limiting
- **Let's Encrypt SSL**: Automatic certificate generation and renewal
- **Service Communication**: Internal Docker network with health checks
- **Automated Deployment**: Git-based deployment with one-command updates

**Key Features:**
- ✅ Single-server deployment (no vendor lock-in)
- ✅ Full resource control and flexibility
- ✅ Automated SSL certificate management
- ✅ Database backups and restore scripts
- ✅ Zero-downtime deployments
- ✅ Comprehensive logging and monitoring
- ✅ Cost-effective ($48-63/month vs $100+/month for managed services)

**Deployment Files:**
- `deployment/docker-compose.yml` - Multi-service orchestration
- `deployment/nginx/nginx.conf` - Reverse proxy with SSL and rate limiting
- `deployment/scripts/setup.sh` - One-command server setup
- `deployment/scripts/deploy.sh` - Git-based deployment updates
- `deployment/scripts/backup.sh` - Database backup automation
- `deployment/DIGITALOCEAN_DEPLOYMENT.md` - Complete deployment guide

**Quick Start:**
1. Create DigitalOcean droplet (Ubuntu 22.04, 8GB RAM)
2. Run `curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/deployment/scripts/setup.sh | sudo bash`
3. Follow prompts for SSH keys, environment variables, and SSL certificates
4. Access at your domain with full lip-sync functionality

See `deployment/DIGITALOCEAN_DEPLOYMENT.md` for complete step-by-step instructions.

### Alternative: Render.com Deployment
The Wav2Lip Flask service can also be deployed as a separate web service on Render (requires Standard tier $25/month minimum for 2GB RAM).

**Critical Configuration:**
- **Start Command**: `python app.py` (NOT `./start.sh`)
- **Instance Type**: Standard ($25/mo) or higher - requires 2GB+ RAM for OpenVINO inference
- **Memory Limit**: Free/Starter tiers (512MB) will cause out-of-memory errors during video generation
- **Docker Build**: Models are pre-built into image during build time (113MB total)

**Render Service Settings:**
- Service Type: Web Service
- Docker Context: `server/wav2lip_service`
- Dockerfile Path: `server/wav2lip_service/Dockerfile`
- Port: 10000 (auto-assigned by Render via PORT env var)
- Health Check Endpoint: `/health`

**Troubleshooting:**
- If service crashes with "Ran out of memory" → Upgrade to Standard tier or higher
- If `/health` reports `models_available: false` → Check Docker build logs for model extraction
- Bootstrap code auto-extracts models from tarball if missing at runtime

## Analytics & Cost Monitoring

### Overview
The application includes a comprehensive analytics system that tracks all API usage and costs in real-time using PostgreSQL for persistent storage across deployments.

### Tracked Metrics
- **Chat Requests**: Input/output tokens, model used, response time, cost per request
- **TTS Requests**: Character count, duration, cost per request
- **Session Tracking**: Unique users by IP address, session timestamps
- **Cost Calculations**: Real-time cost tracking with accurate API pricing

### Pricing (as of Nov 2024)
- **Groq Llama 3.3 70B**: $0.59/1M input tokens, $0.79/1M output tokens
- **OpenAI GPT-4o**: $5.00/1M input tokens, $15.00/1M output tokens
- **OpenAI TTS-1**: $15.00/1M characters

### Admin Dashboard (/admin)
- **Security**: Backend-verified password authentication (default: MKS2005, configurable via ADMIN_PASSWORD env var)
- **Real-time Metrics**: Total costs, request counts, unique users, average response times
- **Period Filters**: Today, Last 7 Days, Last 30 Days, All Time
- **Cost Projections**: Automatic calculation of daily/monthly costs for 100 users based on actual usage patterns
- **Activity Feed**: Last 50 requests with timestamps, costs, and durations
- **CSV Export**: Download complete analytics data for external analysis

### Cost Expectations
Based on realistic usage patterns (5-10 messages/day per user):
- **Light usage** (5 msgs/day): ~$25-40/month for 100 users
- **Moderate usage** (10 msgs/day): ~$50-80/month for 100 users
- Costs scale linearly with usage and are dominated by chat API costs (Groq is significantly cheaper than OpenAI)