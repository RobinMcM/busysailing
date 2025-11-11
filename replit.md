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
The application features a React/TypeScript frontend with Shadcn UI and Tailwind CSS, and an Express.js backend. Core architectural decisions include a dual AI integration strategy, prioritizing Groq (Llama 3.3) for chat responses due to its speed and cost-effectiveness, and OpenAI TTS for high-quality voice generation.

**Avatar System Pivot (Nov 2024):**
After extensive testing, the project pivoted from CPU-based Wav2Lip video generation (which had 20-30 second delays per paragraph, making it unsuitable for real-time chat) to client-side Three.js 3D avatars. This delivers instant, lightweight animations with basic lip-sync using React Three Fiber (@react-three/fiber), providing a superior user experience with zero server-side processing overhead.

The UI/UX emphasizes a mobile-first, WhatsApp-style chat display with dual professional 3D avatars, visual dimming for inactive speakers, and paragraph-based voice alternation using distinct British English female voices. The system incorporates a password gate for access control, rate limiting, and robust error handling. Conversation context is maintained for multi-turn interactions, and all content is localized for the UK.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for state management, Shadcn UI, Tailwind CSS.
- **Backend**: Express.js, Supabase PostgreSQL database with row-level security, rate limiting (20 req/min/IP).
- **AI Integration**: Primary: Groq API (Llama 3.3 70B Versatile); Fallback: OpenAI GPT-4o or Replit AI Integrations. System prompt tailored for UK tax law.
- **3D Avatar System**: Client-side Three.js rendering using React Three Fiber (@react-three/fiber) and Drei. Geometric avatars (sphere head, eyes, nose, mouth) with real-time animations. Speaking states trigger mouth movement (8Hz scaling) and blue point-light glow effect. Proactive WebGL detection with graceful fallback card for unsupported browsers. Zero server-side processing, instant rendering.
- **User Interface**: Mobile-phone-styled chat history, dual independent 3D avatars (256x256 each) with visual dimming (50% opacity for inactive speaker), auto-scroll, timestamps, and professional UK financial services-themed styling.
- **Voice Features**: Speech-to-text (Web Speech API), dual text-to-speech with paragraph-based voice alternation (Consultant: even paragraphs, Partner: odd paragraphs), OpenAI TTS-1 voices (British English female), mute/unmute, and stop speaking controls.
- **Security**: Password gate (MKS2005) for chat access; backend-verified admin authentication for analytics dashboard.
- **Analytics System**: Comprehensive usage tracking with Supabase PostgreSQL persistence and row-level security. Tracks chat/TTS requests, token/character counts, costs, IP addresses, response times. Uses service role key for backend writes. Admin dashboard at /admin with real-time metrics, 100-user cost projections, period filtering, and CSV export.

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
- **Web Speech API**: For client-side Speech-to-Text and as a fallback for Text-to-Speech.
- **Three.js**: Client-side 3D rendering library via React Three Fiber for avatar visualization.

## Deployment Configuration

### Recommended: DigitalOcean Deployment
The application can be deployed to a single DigitalOcean droplet (4GB RAM / 2 vCPU / 80GB SSD) running via Docker. With the Three.js client-side rendering, no backend video processing is needed, significantly simplifying deployment.

**Deployment Structure:**
- **Docker Compose Setup**: Node.js app with Nginx reverse proxy
- **Nginx Reverse Proxy**: Handles SSL termination, routing, and rate limiting
- **Let's Encrypt SSL**: Automatic certificate generation and renewal
- **Supabase PostgreSQL**: Managed database (no self-hosting required)
- **Automated Deployment**: Git-based deployment with one-command updates

**Key Features:**
- ✅ Single-server deployment (no vendor lock-in)
- ✅ Simplified architecture (no video processing backend)
- ✅ Client-side 3D rendering (zero server overhead for avatars)
- ✅ Automated SSL certificate management
- ✅ Zero-downtime deployments
- ✅ Cost-effective (~$24/month for droplet + Supabase free tier)

**Deployment Files:**
- `deployment/docker-compose.yml` - Application orchestration
- `deployment/nginx/nginx.conf` - Reverse proxy with SSL and rate limiting
- `deployment/Dockerfile.app` - Node.js application container
- `deployment/supabase-schema.sql` - Database schema with RLS policies

**Database Setup:**
1. Create Supabase project (free tier available)
2. Run `deployment/supabase-schema.sql` in Supabase SQL Editor
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from project settings
4. Add to environment variables for deployment

**Quick Start:**
1. Create DigitalOcean droplet (Ubuntu 22.04, 4GB RAM)
2. Set up environment variables (GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
3. Deploy via Docker Compose
4. Configure SSL with Let's Encrypt
5. Access at busysailing.com with full 3D avatar functionality

**Note:** The deployment files may reference Wav2Lip service from the previous implementation. These can be ignored as the Three.js avatars render entirely in the browser with no backend processing required.

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