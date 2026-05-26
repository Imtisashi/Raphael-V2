# Raphael V2

Raphael is a React, Vite, Supabase, and Capacitor healthcare booking app for patients, doctors, and clinic administrators.

## Features

- Supabase Auth sign in and password reset when live backend config is available
- Mock OTP signup for demos without paid SMS or email delivery
- Doctor discovery by specialty, symptom, and district
- AI-guided symptom routing with safe, non-diagnostic language
- Voice input and spoken assistant responses in supported browsers
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
VITE_ADMIN_UPI_HANDLE=optional-upi-handle
VITE_ADMIN_NAME=optional-admin-name
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
