# Build Candor Application (MVP)

This document outlines the architecture and execution plan for building Candor—a universal application for iOS, Android, and Web using Expo, Groq (llama-3.3-70b-versatile), and Supabase.

## Goal Description

Build a production-ready MVP for "Candor", an emotionally intelligent AI-powered connection platform. Candor is not a dating app — it is a space for honest conversation. The AI listens, understands the user emotionally, and eventually connects them with compatible people. Features include: Auth, minimal onboarding, AI conversation (powered by Groq/Llama, store inferred traits), matchmaking, and user-to-user realtime chat.

> [!IMPORTANT]
> The associated Supabase project "CandorAI" (`ofrrtnkousbcqkxkzgom`) was inactive and is currently in the `COMING_UP` state. It might take a few minutes before database queries and migrations can be tested.

## User Review Required

> [!WARNING]
> **Groq API Key Storage**
> The Groq API key is stored in `backend/.env` and accessed only by the Python backend (FastAPI). The frontend never touches the key — all AI calls are routed through the backend. Never commit `.env` to git.

> [!NOTE]
> **Styling in React Native**
> Since this is a universal Expo application (targeting mobile and web simultaneously), standard web CSS cannot be natively used for mobile components. I will use standard React Native `StyleSheet` to create the minimal, soft, and animated UI as requested, ensuring cross-platform consistency.

## Proposed Changes

### Project Initialization (candorapp)

- Initialize Expo app with TypeScript and Expo Router in `E:/Candor/candorapp`.
- Install core dependencies: `@supabase/supabase-js`, `expo-secure-store`, `react-native-reanimated`.
- Python backend: `groq`, `fastapi`, `uvicorn`, `python-dotenv`.
- Set up absolute imports and clean up default Expo template boilerplate.

### Database Architecture & Setup

- Execute SQL migration to create the tables and set up Row Level Security (RLS) policies.
- Tables: `profiles`, `conversations`, `messages`, `matches`, `waitlist`. (Note: `users` is handled natively by Supabase Auth (`auth.users`), so `profiles` will link to `auth.users`).

### Application Structure

#### [NEW] `candorapp/app/_layout.tsx` (Root layout & Context Providers)

#### [NEW] `candorapp/app/(auth)/login.tsx` (Magic link / OTP auth)

#### [NEW] `candorapp/app/(tabs)/_layout.tsx` (Tab navigation)

#### [NEW] `candorapp/app/(tabs)/index.tsx` (Dashboard & Onboarding)

#### [NEW] `candorapp/app/(tabs)/chat.tsx` (Conversation interface)

#### [NEW] `candorapp/app/conversation/[id].tsx` (Specific AI or User Chat view)

#### [NEW] `candorapp/components/` (Reusable minimal UI components - Buttons, Inputs, ChatBubbles)

### Services & Logic

#### [NEW] `candorapp/services/supabase.ts` (Supabase client init)

#### [DONE] `candorapp/services/ai.ts` (Frontend AI service — calls the Candor Python backend. Supports `sendMessageToCandor()`, `streamMessageToCandor()`, and legacy `generateReply()` wrapper).

#### [NEW] `candorapp/backend/candor_ai.py` (Core Groq chat engine — system prompt, model config, streaming, history management. Model: llama-3.3-70b-versatile, temp: 0.7, max_tokens: 200).

#### [NEW] `candorapp/backend/server.py` (FastAPI server — POST /chat, POST /chat/stream (SSE), GET /health. CORS enabled. Calm error fallback on Groq failure).

#### [NEW] `candorapp/backend/requirements.txt` (Python deps: groq, fastapi, uvicorn, python-dotenv).

#### [NEW] `candorapp/backend/.env.example` (Template for GROQ_API_KEY).

#### [NEW] `candorapp/hooks/useAuth.ts` (React Context/Hook for session management)

#### [NEW] `candorapp/utils/theme.ts` (Colors, typography for the "soft, emotionally safe" aesthetic)

## Open Questions

1. **Waitlist Workflow:** Should the waitlist be accessible without an account, or is the waitlist the immediate fallback for new web users *instead* of full onboarding?
2. **Matching Engine:** For this MVP, should the matching logic execute on the client side based on fetched traits, or should we create a Postgres Database Trigger / Edge Function that periodically recalculates compatibility scores for all users securely?

## Verification Plan

### Automated Tests

- TypeScript compilation check (`tsc --noEmit`).
- Start Python backend (`uvicorn server:app --reload --port 8000`) and hit `GET /health` to verify.
- Test `/chat` endpoint with a sample message via curl.

### Manual Verification

- Deploy Supabase schema and execute `select * from...` to verify tables are present.
- Start Expo dev server (`npx expo start -w`) and manually verify the Waitlist, Login, and UI layouts in a local web browser.
- Verify Supabase Realtime subscriptions log correctly on message inserts.
