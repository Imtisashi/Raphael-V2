# Raphael V2

Raphael is a React, Vite, Supabase, and Capacitor healthcare booking app for patients, doctors, and clinic administrators.

## Features

- Supabase Auth sign in, signup, and password reset when live backend config is available
- Demo OTP signup fallback without paid SMS or email delivery
- Doctor discovery by specialty, symptom, and district
- AI-guided symptom routing with safe, non-diagnostic language
- Full live AI voice assistant over WebRTC when OpenAI Realtime is configured
- Server-side AI assistant route for OpenAI/Gemini keys, with deterministic local fallback
- Appointment requests, provider accept/decline flow, and payment verification states
- Secured Supabase RLS policies for profile, doctor, and appointment data
- Browser-local fallback doctors, accounts, and appointments when Supabase cannot be reached

## Signup Modes

Signup defaults to live Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present. The register screen also includes a demo OTP mode for no-cost local testing.

Demo OTP code:

```text
123456
```

The verified demo account is saved in the browser's local storage, so it works on the same device even while a live auth provider is unavailable.

## Local Setup

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
VITE_AI_ASSISTANT_ENDPOINT=/api/ai-assistant
VITE_REALTIME_SESSION_ENDPOINT=/api/realtime-session
VITE_ADMIN_UPI_HANDLE=optional-upi-handle
VITE_ADMIN_NAME=optional-admin-name
```

For the Vercel AI route, set one or both server-side variables in Vercel:

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5-mini
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=gemini
```

Live voice requires HTTPS or localhost, browser microphone permission, and `OPENAI_API_KEY` set on Vercel. The key stays server-side in `api/realtime-session.js`.
Do not prefix AI secrets with `VITE_`; `VITE_` variables are exposed to the browser. For local testing of `/api/*` routes, use `vercel dev` or deploy to Vercel because plain `npm run dev` only serves the Vite frontend.

Install and run:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```
