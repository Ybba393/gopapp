# Generation of Promise — Setup Guide

## What Was Built

| Piece | Tech | Purpose |
|-------|------|---------|
| `student-app/` | Expo (React Native) | iOS app for students |
| `admin-dashboard/` | Next.js + Tailwind | Web dashboard for Mrs. Sykes |
| `supabase/` | Postgres + Auth + RLS | Shared backend |

---

## Step 1 — Set Up the Supabase Database

1. Go to [supabase.com](https://supabase.com) and open your project (`kzfipcwvpjgasgaennbq`).
2. In the left sidebar, click **SQL Editor**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. Paste the contents of `supabase/seed.sql` and click **Run**.

### Disable Email Confirmation (Important)
So students can sign up without confirming their email:
1. Go to **Authentication → Providers → Email**
2. Turn off **"Confirm email"**
3. Save.

### Get Your Service Role Key
You'll need this for the admin dashboard:
1. Go to **Project Settings → API**
2. Copy the **`service_role`** key (secret — never share publicly)

---

## Step 2 — Create Your Admin Account

1. Open the student app (or run it locally with `npx expo start`)
2. Go to **Sign Up**
3. Use email: `abby.nguyen77@gmail.com`, name: anything, password: `GOPStudent`
4. You'll be prompted to set a new password — do that
5. Your account is automatically set to `admin` role because the email was seeded

---

## Step 3 — Run the Admin Dashboard Locally

```bash
cd admin-dashboard
npm install
```

Create a `.env.local` file (copy from `.env.example`) and fill in your service role key:
```
NEXT_PUBLIC_SUPABASE_URL=https://kzfipcwvpjgasgaennbq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Then start it:
```bash
npm run dev
```

Open http://localhost:3000 and sign in with your admin credentials.

---

## Step 4 — Deploy Admin Dashboard to Vercel

1. Push the `admin-dashboard/` folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Set the **Root Directory** to `admin-dashboard`
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← paste the secret key here
5. Deploy — Vercel gives you a URL like `gop-admin.vercel.app`

---

## Step 5 — Run the Student App

```bash
cd student-app
npm install
npx expo start
```

- Press `i` to open in iOS Simulator
- Or install **Expo Go** on your iPhone and scan the QR code

### Build for TestFlight / App Store
```bash
npx expo install --fix
npx eas build --platform ios --profile preview
```
(Requires an [Expo EAS account](https://expo.dev) and Apple Developer account)

---

## Admin Dashboard — What Each Page Does

| Page | What You Can Do |
|------|----------------|
| **Overview** | See total students, groups, check-ins, recent volunteer hour submissions |
| **Roster** | Add/remove students from the approved sign-up list. Students can only create an account if their email is here. |
| **Capstone Groups** | Create groups, assign students to groups, rename groups |
| **Program Days** | Add/edit/delete program days per cohort. Check "Has Exit Ticket" for Race & Culture Day. |
| **Exit Tickets** | View every student's Race & Culture Day exit ticket submission in detail |
| **Cohorts** | Create a new cohort each year (e.g. "2027–2028 Cohort"). Set one as active — students in that cohort see its program days. |

---

## Each New Year: Checklist

1. Go to **Cohorts** → Create new cohort (e.g. `2027–2028 Cohort`)
2. Set it as **Active**
3. Go to **Program Days** → Add the 7 program days with new dates for the new cohort
4. Go to **Roster** → Add all new students' names + emails (assign them to the new cohort)
5. Students sign up with their email + default password `GOPStudent`

---

## Transferring Admin Access to Mrs. Sykes

1. Go to **Roster** → Add her email with `is_admin = true`
   - Do this via **Supabase SQL Editor**: `UPDATE roster SET is_admin = true WHERE email = 'sykes@email.com';`
   - Or add a "Make Admin" feature to the dashboard later
2. She signs up in the app with default password → sets her own password
3. She can then log in to the admin dashboard at the Vercel URL

---

## Credentials Summary

| Item | Value |
|------|-------|
| Supabase project URL | `https://kzfipcwvpjgasgaennbq.supabase.co` |
| Supabase anon key | in `.env` files |
| Admin test account | `abby.nguyen77@gmail.com` |
| Default student password | `GOPStudent` |

---

## Notes

- **Default password `GOPStudent`** — students are forced to change it on first login
- **Check-in** — only enabled at 9:00 AM on the day of the program
- **Exit tickets** — one-time submission, locked after submit, visible to student and admin
- **Capstone groups** — students can rename their group from inside the app (Profile → not yet built; admin renames via dashboard)
- All credential files (`.env`, `.env.local`) are **not** committed to git — keep them safe
