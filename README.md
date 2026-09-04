# Vaultra — Secure File Storage Service

A production-grade secure file storage and sharing service built with TanStack Start, Supabase, and React. Users can upload files up to 1 GB, keep them private by default, and share them through expiring signed links.

## Live Demo

https://vaultra-one.vercel.app/

## Repository

https://github.com/Kenny01-code/Vaultra

## Tech Stack

- **Frontend**: React 19, TanStack Start (SSR), TanStack Router, TanStack Query
- **Auth**: Supabase Auth (Email/Password, Google, GitHub OAuth)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Storage**: Supabase Storage (private bucket, signed URLs)
- **Server Functions**: TanStack Start server functions with Supabase Admin client
- **Styling**: Tailwind CSS v4, Radix UI
- **Language**: TypeScript (strict)

---

## Local Development

### Prerequisites

- Node.js v18+
- npm v9+
- A Supabase project (free tier works)

### 1. Clone and install

```sh
git clone https://github.com/Kenny01-code/Vaultra.git
cd Vaultra
npm install
```

### 2. Set up environment variables

Copy `.env.example` and fill in the values:

```sh
cp .env.example .env.local
```

Required variables:

```env
# Supabase client (safe to expose — used in the browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Supabase server (server-only — NEVER prefix with VITE_)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Getting your Supabase keys:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Settings → API
3. Copy the Project URL, anon/publishable key, and service_role key

### 3. Run database migrations

```sh
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Run the dev server

```sh
npm run dev
```

Open http://localhost:3000

---

## Supabase Setup

### Enable Authentication Providers

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Providers:

#### Email/Password
- Enable Email provider → Save

#### Google
- Enable Google provider
- Add your Google OAuth Client ID and Secret (from Google Cloud Console)
- Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

#### GitHub OAuth

1. Go to https://github.com/settings/developers → OAuth Apps → New OAuth App
2. Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret into Supabase → Authentication → GitHub provider


### Storage Bucket

The migration creates the `vault` bucket automatically. Verify in:
Supabase Dashboard → Storage → Buckets → `vault` (should be private)

---

## Deploying

### Vercel (recommended)

1. Push to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Add all environment variables from `.env.local` in Vercel's dashboard
4. Deploy

### Netlify

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist/public`
5. Add environment variables in Site Settings → Environment Variables

---

## Architecture

```
Browser
  └── TanStack Router (client-side navigation)
       └── TanStack Start (SSR + server functions)
            ├── Supabase Auth (client SDK) — session management
            ├── Supabase DB (client SDK) — file metadata queries (RLS enforced)
            └── Server Functions (Supabase Admin SDK — bypasses RLS safely)
                 ├── createUploadTicket — validates quota server-side, issues signed PUT URL
                 ├── finalizeUpload — verifies file exists, reads real size, re-checks quota, creates DB record
                 ├── getOwnedFileUrl — issues signed GET URL (5 min TTL)
                 ├── setFileVisibility — toggle public/private (ownership enforced)
                 ├── renameFile — sanitized rename (ownership enforced)
                 ├── deleteFile — removes from Storage + DB (ownership enforced)
                 └── getSharedFile — public share endpoint (no auth required)
```

### Upload Flow

1. Browser calls `createUploadTicket` server fn → validates file type/size/quota server-side → returns Supabase Storage signed PUT URL
2. Browser PUTs file directly to Supabase Storage (bypasses server — no bandwidth cost)
3. Browser calls `finalizeUpload` server fn → Admin SDK verifies file exists → reads **actual** server-side size (never trusts client) → re-checks quota against that actual size → creates DB record
4. File appears in vault

### Share Link Flow

1. User toggles file to public → `setFileVisibility` server fn updates DB
2. Share link: `https://yourapp.com/s/<share_token>`
3. Share page loader calls `getSharedFile` server fn → Admin SDK fetches file → issues 10-min signed URL
4. Visitor downloads directly from Supabase Storage

---

## Security

### Quota Enforcement

Quota is enforced **server-side** in both upload stages:
- Reads the user's `storage_quota_bytes` from the DB (Admin SDK, bypasses RLS)
- Sums all existing `size_bytes` for the user
- `createUploadTicket` rejects the upload if `used + declaredFileSize > quota`
- `finalizeUpload` reads the actual object size from Storage and rejects if `used + actualFileSize > quota`
- An over-quota uploaded object is deleted before any file record is created
- `size_bytes` stored in DB always comes from server-side object metadata — never from the client

### Row Level Security (Supabase)

Key policies:
- Users can only read/write their own files (`owner_id = auth.uid()`)
- Public files (`is_public = true`) are readable by anyone — needed for share links
- `storage_quota_bytes` cannot be set or changed by the client (migration enforces this)
- User roles can only be written by the service role — never by clients
- All other paths are denied by default

### Storage Policies

Key rules:
- Files must be under `{userId}/` — enforces ownership at path level
- Max 1 GB per file
- Blocked MIME types: executables, PHP, HTML, SVG, shell scripts (OWASP)
- No public reads — all downloads go through server-issued signed URLs

---

## Performance Optimizations

- **Self-hosted fonts** — Sora, Inter Tight, JetBrains Mono served from `/public/fonts/` — eliminates render-blocking Google Fonts request
- **Lazy loading** — CinematicVault, IPhoneFrame, FilePreviewDialog loaded on demand
- **content-visibility: auto** — below-fold sections skip rendering until scrolled into view
- **TanStack Query** — aggressive caching (staleTime 20s, gcTime 5min), no refetch on window focus
- **Route preloading** — links preload on hover/focus (`defaultPreload: "intent"`)
- **GPU layers** — animated elements promoted to compositor with `translateZ(0)`
- **DNS prefetch** — Supabase endpoints prefetched on page load
- **Direct-to-storage upload** — files PUT directly to Supabase Storage via signed URL, no server bandwidth

---

## Assignment Checklist

| Requirement | Status |
|---|---|
| User registration + login | ✅ Email/password + Google/GitHub OAuth |
| File upload (100 MB+, up to 1 GB) | ✅ Signed URL direct-to-storage upload |
| Upload progress | ✅ XHR progress events |
| File validation | ✅ Type, size, MIME, extension (OWASP) — client + server |
| Private files (owner-only) | ✅ Supabase RLS + server ownership checks |
| Public files via share link | ✅ Expiring signed URLs via share token |
| File management (rename, delete, toggle) | ✅ Full CRUD via server functions |
| Quota tracking | ✅ Server-side enforcement at ticket creation and finalization |
| Responsive design | ✅ Mobile-first, xs/sm/md/lg/xl breakpoints |
| Error handling | ✅ Toast notifications, server error boundaries |
| TypeScript | ✅ Strict mode |
| Security rules | ✅ Supabase RLS + Storage policies |
| Documentation | ✅ This README |



