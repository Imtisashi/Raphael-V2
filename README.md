# Raphael V2

Raphael is a React, Vite, Supabase, and Capacitor healthcare booking app for patients, doctors, and clinic administrators.

## Features

- Supabase Auth sign in and password reset when live backend config is available
- Mock OTP signup for demos without paid SMS or email delivery
- Doctor discovery by specialty, symptom, and district
- AI-guided symptom routing with safe, non-diagnostic language
- Voice input and spoken assistant responses in supported browsers
- Server-side AI assistant route for OpenAI/Gemini keys, with deterministic local fallback
- Appointment requests, provider accept/decline flow, and payment verification states
- Secured Supabase RLS policies for profile, doctor, and appointment data
- Browser-local fallback doctors, accounts, and appointments when Supabase cannot be reached

## Demo OTP

Signup currently uses a mock OTP code:

```text
123456
```

The verified demo account is saved in the browser's local storage, so it works on Vercel even while the live auth provider is unavailable.

## Local Setup

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
VITE_AI_ASSISTANT_ENDPOINT=/api/ai-assistant
VITE_ADMIN_UPI_HANDLE=optional-upi-handle
VITE_ADMIN_NAME=optional-admin-name
```

For the Vercel AI route, set one or both server-side variables in Vercel:

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.4-mini
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=openai
```

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
