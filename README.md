# WaterSys CRM — Water Filtration & Chemical Injection Operations Platform

A full-stack, offline-capable CRM + operations platform for Water Systems.
Built as a Turborepo monorepo: **Next.js 14 web app** + **Expo React Native mobile app**.

---

## Architecture

```
watersys/
├── apps/
│   ├── web/          # Next.js 14 — office-first web app (Vercel)
│   └── mobile/       # Expo — iOS + Android field-tech app
├── packages/
│   ├── db/           # Prisma schema + client (Supabase PostgreSQL)
│   └── shared/       # Constants, permission config (shared by both apps)
```

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 14 (App Router) + TypeScript |
| Mobile | Expo SDK 51 + Expo Router (React Native) |
| API | tRPC v11 (end-to-end type safety) |
| Database | Supabase PostgreSQL + Prisma ORM |
| Auth | Supabase Auth (JWT, role-based) |
| UI (web) | TailwindCSS + shadcn/ui |
| UI (mobile) | NativeWind + StyleSheet |
| Offline | Expo SQLite + MMKV write queue |
| E-sign | Dropbox Sign (HelloSign) embedded |
| SMS | Twilio |
| Email | Resend |
| QBO | node-quickbooks + intuit-oauth |
| Maps | Google Maps |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Supabase account](https://supabase.com) (free tier works)
- [Dropbox Sign account](https://www.hellosign.com) (was HelloSign)
- [Twilio account](https://twilio.com)
- [Resend account](https://resend.com)
- [QuickBooks Online](https://developer.intuit.com) developer account
- [Google Cloud project](https://console.cloud.google.com) with Maps + Calendar APIs

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd watersys
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Database setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (creates all tables)
pnpm db:migrate

# (Optional) View data in Prisma Studio
pnpm db:studio
```

### 4. Supabase setup

In the Supabase dashboard:
1. Create a new project
2. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Copy the Postgres connection string to `DATABASE_URL` and `DIRECT_URL`
4. Enable Email auth provider

### 5. Create first admin user

In the Supabase dashboard → Authentication → Users → Invite User:
- Create user with your email

Then in Supabase SQL Editor:
```sql
INSERT INTO users (id, email, name, role)
VALUES (gen_random_uuid(), 'your@email.com', 'Your Name', 'OWNER');
```

### 6. Set up inventory locations

```sql
INSERT INTO inventory_locations (id, name, type, description) VALUES
  (gen_random_uuid(), 'Storage Unit 1', 'STORAGE_UNIT', ''),
  (gen_random_uuid(), 'Storage Unit 2', 'STORAGE_UNIT', ''),
  (gen_random_uuid(), 'Storage Unit 3', 'STORAGE_UNIT', ''),
  (gen_random_uuid(), 'Storage Unit 4', 'STORAGE_UNIT', ''),
  (gen_random_uuid(), 'Storage Unit 5', 'STORAGE_UNIT', ''),
  (gen_random_uuid(), 'Garage', 'GARAGE', ''),
  (gen_random_uuid(), 'Truck 1', 'TRUCK', ''),
  (gen_random_uuid(), 'Truck 2', 'TRUCK', ''),
  (gen_random_uuid(), 'Trailer 1', 'TRAILER', ''),
  (gen_random_uuid(), 'Trailer 2', 'TRAILER', '');
```

### 7. Set up Dropbox Sign webhooks

In the Dropbox Sign API settings:
- Webhook URL: `https://your-domain.com/api/webhooks/hellosign`
- Events: `signature_request_all_signed`, `signature_request_sent`

### 8. Run development

```bash
# Start web app
pnpm dev:web

# Start mobile app (in a separate terminal)
pnpm dev:mobile
# Then press 'i' for iOS simulator or 'a' for Android
```

---

## Deployment

### Web (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables in the Vercel dashboard.

### Mobile (Expo EAS)

```bash
cd apps/mobile

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (first time)
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Key Workflows

### Lead → Estimate → Signed → Job

1. **Capture lead**: web Quick Add or mobile lead form
2. **Water test**: log structured results + attachments
3. **Build estimate**: dual options (Best + Cost-Effective) with line items
4. **Send estimate**: click Send → Dropbox Sign request created + email/SMS sent
5. **Customer acceptance**: customer visits portal link → reviews test results → compares options → selects → signs via Dropbox Sign embedded
6. **Webhook fires**: estimate status → ACCEPTED, lead stage → ESTIMATE_ACCEPTED
7. **Schedule job**: create job from estimate, assign techs, schedule
8. **Field work**: mobile app — checklist, photos, water tests, parts usage
9. **Invoice**: create from completed job → sync to QBO

### Offline Support (Mobile)

- **Reads**: job details, system specs, customer info cached in SQLite
- **Writes**: queued in MMKV, synced when online
- **Manuals**: PDF cached to local filesystem via Expo FileSystem
- **Background sync**: expo-background-fetch replays queue every 15 minutes

---

## Data Migration

### Phase 1: Customers (Week 1)
Use the built-in CSV import UI (`/settings/import`) to import customer records.
- Dedup by email + phone fuzzy match
- Map columns to Customer + Site fields

### Phase 2: Invoices (Week 2)
Pull directly from QBO API via `/settings/integrations/qbo/import`

### Phase 3: Historical records (Week 3)
Import existing tickets/notes as Interaction records via CSV

### Phase 4: Dropbox docs (Week 4)
Dropbox folder scanner at `/settings/integrations/dropbox/link`
- Scans existing folders and suggests customer matches by name

---

## QuickBooks Online Sync

Sync behavior:
- **Customers**: bi-directional (create/update)
- **Items/Services**: pull from QBO → link to inventory items
- **Invoices**: push from WaterSys → QBO (creates invoice in QBO)
- **Payments**: pull from QBO → mark invoices paid
- **Sync status**: visible on each invoice — synced / pending / error + retry button

---

## Permission Reference

| Role | Financials | Estimates | Schedule | Inventory | Settings |
|---|---|---|---|---|---|
| Owner | Full | Full | Full | Full | Full |
| Office Manager | Full | Full | Full | Full | None |
| Receptionist | None | View | Write | None | None |
| Installer | None | View | View own | Parts checkout | None |
| Service Tech | None | View | View own | Parts checkout | None |

---

## Support

- Issues: report in project tracker
- Stack: Next.js, Expo, Supabase, Prisma, tRPC, Dropbox Sign, Twilio, Resend, QBO
