# Vaultra — Secure File Storage Service

A production-oriented secure file storage and sharing service built with TanStack Start, Supabase, and React. Users can upload files up to 1 GB, keep them private by default, and share them through short-lived signed links.

## Live Demo

https://vaultra-one.vercel.app/

## Repository

https://github.com/Kenny01-code/Vaultra

## Tech Stack

* **Frontend**: React 19, TanStack Start (SSR), TanStack Router, TanStack Query
* **Auth**: Supabase Auth (Email/Password, Google, GitHub OAuth)
* **Database**: Supabase PostgreSQL + Row Level Security
* **Storage**: Supabase Storage (private bucket, signed URLs)
* **Server Functions**: TanStack Start server functions with Supabase Admin client
* **Styling**: Tailwind CSS v4, Radix UI
* **Language**: TypeScript (strict)

---

## Local Development

### Prerequisites

* Node.js v18+
* npm v9+
* A Supabase project (free tier works)

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

1. Go to Supabase Dashboard → your project
2. Open **Settings → API**
3. Copy the Project URL, publishable/anon key, and service role key

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to source control.

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

Open:

http://localhost:3000

---

## Supabase Setup

### Enable Authentication Providers

Go to Supabase Dashboard → **Authentication → Providers**.

#### Email/Password

* Enable the Email provider
* Save the configuration

#### Google

* Enable the Google provider
* Add your Google OAuth Client ID and Secret from Google Cloud Console
* Configure the Supabase callback URL:

```text
https://your-project.supabase.co/auth/v1/callback
```

#### GitHub OAuth

1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Create a new OAuth App
3. Set the authorization callback URL to:

```text
https://your-project.supabase.co/auth/v1/callback
```

4. Copy the Client ID and Client Secret into Supabase → Authentication → GitHub provider

Google and GitHub OAuth require the providers to be enabled and configured in the Supabase project being used.

### Storage Bucket

The migration creates the `vault` bucket automatically.

Verify in:

**Supabase Dashboard → Storage → Buckets → `vault`**

The bucket should remain **private**.

---

## Deploying

### Vercel (recommended)

1. Push the repository to GitHub
2. Go to Vercel and import the repository
3. Add all required environment variables in the Vercel project settings
4. Deploy

### Netlify

1. Push the repository to GitHub
2. Import the repository into Netlify
3. Build command:

```sh
npm run build
```

4. Publish directory:

```text
dist/public
```

5. Add the required environment variables in Site Settings → Environment Variables

---

## Architecture

```text
Browser
 └── TanStack Router (client-side navigation)
      └── TanStack Start (SSR + server functions)
           ├── Supabase Auth (client SDK) — session management
           ├── Supabase DB (client SDK) — file metadata queries (RLS enforced)
           └── Server Functions (Supabase Admin SDK)
                ├── createUploadTicket — validates quota and file policy, issues signed PUT URL
                ├── createAvatarUploadTicket — issues a server-authorized avatar PUT URL
                ├── discardUpload — removes incomplete owned uploads
                ├── finalizeUpload — verifies object, reads actual size, re-checks quota atomically, creates DB record
                ├── getOwnedFileUrl — issues signed GET URL
                ├── setFileVisibility — toggles public/private state with ownership enforcement
                ├── renameFile — sanitized rename with ownership enforcement
                ├── deleteFile — removes Storage object and DB record with ownership enforcement
                └── getSharedFile — public share endpoint that issues temporary access
```

### Upload Flow

1. The client accepts up to 10 files per picker or drop batch.
2. The browser calls `createUploadTicket` → the server validates file type, size, and quota.
3. The server returns a short-lived Supabase Storage signed upload URL.
4. The browser uploads the file directly to private Supabase Storage, avoiding application-server bandwidth.
5. The browser calls `finalizeUpload`.
6. `finalizeUpload` verifies that the object exists, reads its actual Storage metadata size, and atomically re-checks the user's quota.
7. If valid, the database record is created and the file appears in the vault.

### Share Link Flow

1. The owner toggles a file to public using `setFileVisibility`.
2. A share URL is generated using the file's share token:

```text
https://yourapp.com/s/<share_token>
```

3. The share page calls `getSharedFile` without requiring authentication.
4. The server verifies the shared file and issues a short-lived signed Storage download URL.
5. The visitor downloads the file directly from private Supabase Storage.

The Storage bucket itself remains private; public sharing is implemented through controlled server-issued signed URLs.

---

## Security

### Quota Enforcement

Quota is enforced **server-side** during both upload stages:

* Reads the user's `storage_quota_bytes` from the database
* Sums existing `size_bytes` for the user
* `createUploadTicket` rejects an upload when `used + declaredFileSize > quota`
* `finalizeUpload` reads the actual Storage object size and re-checks quota
* Each account has a 5 GB default quota
* Each individual file is limited to 1 GB
* Each upload selection/drop is limited to 10 files
* Finalization locks the user's profile row during the quota check, preventing concurrent uploads from exceeding the quota
* Over-quota uploaded objects are deleted before a file record is created
* Database `size_bytes` values come from server-side Storage metadata rather than client-provided values

### Upload Cleanup

* Authenticated users cannot directly insert or update objects in the private vault bucket
* Uploads use short-lived, server-issued signed URLs
* Cancelled uploads and failed finalization attempt best-effort cleanup through `discardUpload`
* Production deployments should also schedule a periodic reconciliation job to remove orphaned Storage objects without matching `files` records

### Row Level Security (Supabase)

Key policies include:

* Users can only access their own file records (`owner_id = auth.uid()`)
* Public sharing is controlled through the file's visibility state and server-side share endpoint
* `storage_quota_bytes` cannot be modified by clients
* User roles can only be written by the service role
* All other database access is denied by default

### Storage Policies

Key rules include:

* Objects must be stored under `{userId}/`
* Maximum file size is 1 GB
* Blocked file types include executables, PHP, HTML, SVG, and shell scripts
* The Storage bucket remains private
* Downloads are provided through server-issued signed URLs

---

## Performance Optimizations

* **Self-hosted fonts** — Sora, Inter Tight, and JetBrains Mono served from `/public/fonts/`
* **Lazy loading** — CinematicVault, IPhoneFrame, and FilePreviewDialog loaded on demand
* **content-visibility: auto** — below-fold sections avoid unnecessary rendering until needed
* **TanStack Query** — caching with a 20s stale time and 5min garbage-collection time
* **Upload rendering** — progress callbacks are throttled to reduce unnecessary React re-renders
* **Auth hydration** — vault queries wait for profile synchronization to finish
* **Route preloading** — links preload on hover/focus using `defaultPreload: "intent"`
* **GPU layers** — animated elements use compositor-friendly transforms
* **DNS prefetch** — Supabase endpoints are prefetched
* **Direct-to-storage uploads** — files are uploaded directly to Supabase Storage through signed URLs without passing through the application server

---

## Assignment Checklist

| Requirement                       | Status                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| User registration + login         | Complete — Email/password + Google/GitHub OAuth                           |
| File upload (100 MB+, up to 1 GB) | Complete — Signed URL direct-to-storage upload                            |
| Upload progress                   | Complete — XHR progress events                                            |
| Batch upload limit                | Complete — Maximum 10 files per selection/drop                            |
| File validation                   | Complete — Type, size, MIME, and extension validation                     |
| Private files (owner-only)        | Complete — Supabase RLS + server ownership checks                         |
| Public files via share link       | Complete — Share token + expiring signed URLs                             |
| File management                   | Complete — Rename, delete, visibility toggle                              |
| Quota tracking                    | Complete — 5 GB default quota, 1 GB per-file cap, server-side enforcement |
| Responsive design                 | Complete — Mobile-first responsive breakpoints                            |
| Error handling                    | Complete — Toast notifications + server error handling                    |
| TypeScript                        | Complete — Strict mode                                                    |
| Security rules                    | Complete — Supabase RLS + Storage policies                                |
| Documentation                     | Complete — This README                                                    |

---

## Verification

Before submission, the following checks should pass:

```sh
npm run lint
npm run build
```

Current lint status: **0 errors**. The remaining 7 warnings are non-blocking React Fast Refresh warnings.

`npm run build` is the production compilation check.
