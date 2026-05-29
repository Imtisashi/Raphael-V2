# Raphael V2

Raphael is a React, Vite, Supabase, and Capacitor healthcare booking app for patients, doctors, and clinic administrators.

## Features

- Supabase Auth sign in, signup, and password reset when live backend config is available
- Doctor discovery by specialty, symptom, and district
- Plain symptom and specialty search across live provider records
- Manual admin approval before a provider becomes public or bookable
- Appointment requests, provider accept/decline flow, UPI UTR submission, and admin verification
- Admin payment readiness checks, configurable platform fee, and payout dashboard for doctor settlement calculations before a business payment account is available
- Append-only appointment and admin activity trails for booking, payment, verification, provider review, settings, rejection, and payout events
- Persistent Supabase notification inbox, Capacitor local notifications, and FCM-ready Android push delivery
- Secured Supabase RLS policies and RPC guards for profile, doctor, appointment, payment, and payout data
- Live Supabase-backed doctors, accounts, and appointments

## Live Backend

The app now uses only the live Supabase backend. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before signing in, registering providers, booking appointments, or taking payments.

Admin access is intentionally not available through public signup. Create or update an admin profile directly in Supabase by setting `public.users.role = 'admin'` for the trusted account.

Provider accounts can self-register, but their doctor profile starts as `pending`. Pending, rejected, and suspended providers are hidden from public search and blocked by the booking RPC. Admins approve or reject provider profiles from the admin dashboard. If an approved provider changes material identity, fee, clinic, or UPI details, the database automatically returns the profile to `pending` for review.

## Payment Flow

1. Patient books a visit.
2. Doctor accepts or declines the request.
3. After acceptance, the patient opens UPI and submits the UTR/transaction ID in the app.
4. Admin sees the payment proof queue, checks the UTR, and verifies or rejects it.
5. Verification confirms the booking and creates a doctor payout due amount using the platform fee stored in Supabase.
6. Admin marks doctor payouts as paid after settlement.

Every appointment milestone writes both a `notifications` row for the right patient, doctor, or admin and an append-only `appointment_events` audit row for the appointment timeline. Sensitive admin actions also write `admin_audit_events` rows for the operations dashboard; direct client inserts are blocked so those rows are created only by trusted admin workflow RPCs. The app listens to notifications in realtime, mirrors them to local Android notifications while the app is running, and queues FCM delivery rows for killed-app Android push once Firebase is configured.

Booking, doctor decisions, patient payment submission, admin verification, provider approval, platform-fee changes, rejection, and payout marking run through Supabase RPC functions. The database calculates settlement amounts from `public.app_settings.platform_fee_percent` and blocks unapproved provider bookings, forged statuses, invalid slots, duplicate active doctor slots, duplicate UTR submissions, missing UPI receivers, and underpriced direct inserts. Push queue dispatch is scoped so normal signed-in users only process notifications they caused or receive, while admins can process the full queue. The admin UI also separates payout due and paid amounts, shows doctor UPI IDs where available, and exports settlement reports with due/paid totals.

Supabase Auth is the only password store. The public profile table intentionally does not keep a password column.
Public RPC execution is explicit: booking, payment, payout, profile linking, and settlement helper functions are not anonymously executable. Appointment rows must be created through `create_appointment_request`; direct authenticated inserts are blocked by the booking workflow marker.

## Android Push Setup

The code path is wired for low-cost Firebase Cloud Messaging, but the real Firebase files and secrets are intentionally not committed.

1. Create a Firebase Android app for package `com.raphael.health`.
2. Download `google-services.json` into `android/app/google-services.json`.
3. In Supabase Edge Function secrets, set `FCM_SERVICE_ACCOUNT_JSON` to the Firebase service-account JSON.
4. Deploy/use the `dispatch-push-queue` Edge Function. Booking, doctor, patient payment, and admin payment actions call it after the database writes succeed.

Without those Firebase credentials, the app still uses the durable in-app notification inbox plus local notifications when the app is active.

The older `dispatch-push-notifications` Edge Function is retired and returns HTTP 410. Keep new integrations on `dispatch-push-queue`.

## Local Setup

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
VITE_ADMIN_UPI_HANDLE=optional-upi-handle
VITE_ADMIN_NAME=optional-admin-name
VITE_PLATFORM_FEE_PERCENT=10 # fallback only; admins can change the live fee in the Supabase-backed admin UI
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
npx cap sync android
```
