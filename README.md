# Civilezy Affiliate Admin

A fast internal admin tool to generate affiliate links and send onboarding emails — from paste to sent in under 30 seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Email | Resend (or Nodemailer/SMTP) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd civilezy-affiliate
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project.
2. Enable **Authentication** → Email/Password provider.
3. Create an admin user under Authentication → Users.
4. Enable **Firestore Database** in production mode.
5. Deploy security rules: `firebase deploy --only firestore:rules`
6. Go to Project Settings → Service Accounts → Generate new private key → download JSON.

### 3. Email Setup (Resend — Recommended)

1. Sign up at [resend.com](https://resend.com).
2. Verify your domain (`civilezy.in`).
3. Create an API key.

### 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

**Firebase Client (from Project Settings → General → Your apps):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**Firebase Admin (from the downloaded service account JSON):**
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Email (Resend):**
```
RESEND_API_KEY=re_...
EMAIL_FROM=no-reply@civilezy.in
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your Firebase admin user.

---

## Deployment (Vercel — Recommended)

```bash
npm install -g vercel
vercel
```

Add all environment variables in Vercel → Project → Settings → Environment Variables.

---

## Adding or Editing Products

All products live in a single file:

```
src/lib/products.ts
```

Each product follows this structure:

```ts
{
  id: string,          // unique slug
  title: string,       // display name
  category: "course" | "bundle" | "ebook",
  purchaseUrl: string, // base EzyCourse checkout URL
  defaultCoupon?: string  // auto-applied for bundles; omit for courses & ebooks
}
```

**Link generation is automatic.** When you add/remove/edit products here, all generated links and emails update automatically — no other files need changing.

---

## Workflow

1. Create affiliate in EzyCourse → copy the referral link.
2. Open this admin tool → click **Add Affiliate**.
3. Enter Name and Email.
4. Paste the EzyCourse referral link (`https://learn.civilezy.in?ref_id=...`).
5. Click **Generate & Send Email**.
6. Done ✅ — links generated, email sent, metadata saved.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── affiliates/route.ts    # CRUD for affiliates (Firestore)
│   │   └── send-email/route.ts    # Email sending endpoint
│   ├── login/page.tsx             # Login page
│   ├── page.tsx                   # Main dashboard
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AddAffiliateModal.tsx      # Add form + link preview
│   └── AffiliatesTable.tsx        # Table with Resend / Delete
└── lib/
    ├── products.ts                # ← SINGLE SOURCE OF TRUTH for all products
    ├── email-template.ts          # HTML + plain-text email generation
    ├── firebase.ts                # Firebase client
    ├── firebase-admin.ts          # Firebase Admin SDK
    ├── use-auth.ts                # Auth guard hook
    └── utils.ts
```

---

## Firestore Schema

```
affiliates/
  {docId}/
    name:          string
    email:         string
    referralLink:  string   (original pasted URL)
    refId:         string   (extracted ref_id value)
    createdAt:     timestamp
```

Generated URLs are **never stored** — they're derived on demand from `products.ts` + `refId`.
