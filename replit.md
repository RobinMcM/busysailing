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
- **Backend**: Express.js, in-memory storage, rate limiting (20 req/min/IP).
- **AI Integration**: Primary: Groq API (Llama 3.3 70B Versatile); Fallback: OpenAI GPT-5 or Replit AI Integrations. System prompt tailored for UK tax law.
- **Wav2Lip Integration**: Flask API service with OpenVINO-based Wav2Lip inference. Models converted to OpenVINO IR format. Supports FPS-synchronized audio processing and promise-based sequential execution. Graceful fallback to Web Speech API.
- **User Interface**: Mobile-phone-styled chat history, dual independent avatars with visual dimming, auto-scroll, timestamps, and professional UK financial services-themed styling.
- **Voice Features**: Speech-to-text (Web Speech API), dual text-to-speech with paragraph-based voice alternation (Consultant/Partner voices), mute/unmute, and stop speaking controls.
- **Security**: Password gate (MKS2005) for access control.

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
- **OpenAI API**: For high-quality Text-to-Speech (TTS) voices (GPT-5 for chat fallback, primary for TTS).
- **Replit AI Integrations**: As a fallback for both chat and TTS.
- **Web Speech API**: For client-side Speech-to-Text and as a fallback for Text-to-Speech/Wav2Lip.
- **OpenVINO**: Used in the Wav2Lip Flask service for optimized, CPU-based model inference.