# Vaultra Reviewer Notes

Thank you for reviewing Vaultra. This document provides the shortest path through the application and highlights the engineering decisions most relevant to the assignment.

## Quick Links

- Live demo: https://vaultra-one.vercel.app/
- Repository: https://github.com/Kenny01-code/Vaultra
- Local entry point: http://localhost:3000

## Login

Create a fresh account through the email/password sign-up flow on the login page. OAuth providers are also supported when configured in the Supabase project.

No credentials or secrets are committed to this repository. Temporary reviewer credentials can be supplied separately when needed.

After registration, the application creates the user's profile with the default 5 GB quota. The vault is protected by authenticated routing and user-specific authorization checks.

## Local Setup

### Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Supabase project
- Supabase CLI, if applying migrations locally

### Install and configure

```bash
npm install
```

Copy `.env.example` to `.env.local` and configure the required Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

The service-role key must only exist in server/deployment environment variables. Never commit it or place it in a `VITE_` variable.

### Apply the database

```bash
supabase link --project-ref your-project-ref
supabase db push
```

The latest upload-hardening migration is required before testing uploads:

`supabase/migrations/20260903000000_harden_uploads_and_atomic_quota.sql`

It removes direct authenticated Storage writes and adds atomic quota enforcement during upload finalization.

### Run the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Recommended Review Flow

1. Register or sign in.
2. Upload a file larger than 100 MB and observe the progress indicator.
3. Confirm the file appears in the private vault.
4. Preview, rename, download, and delete the file.
5. Toggle a file public and open its share link in a private browser window.
6. Revoke public access and confirm the file is no longer publicly available.
7. Test invalid file types and files above the 1 GB per-file limit.
8. Temporarily lower a test account's `storage_quota_bytes` in Supabase and attempt an upload larger than the remaining quota.
9. Check the responsive layout at desktop and mobile widths.
10. Sign out and confirm protected vault routes redirect to authentication.

## Core Engineering Focus

### Authentication and authorization

- Protected routes verify the authenticated Supabase user.
- File operations enforce ownership through server-side checks and database policies.
- Private files are not exposed through public application queries.
- Admin operations perform explicit role checks.

### Upload architecture

1. The client requests a server-issued upload ticket.
2. The server validates the filename, MIME type, extension, per-file size, and declared quota usage.
3. The browser uploads directly to the private Supabase Storage bucket using the short-lived signed URL, preserving progress reporting without routing large files through the application server.
4. `finalizeUpload` verifies that the object exists and reads the actual size from Storage metadata.
5. A database function locks the user's profile row, checks the actual size against current usage and quota, and creates the file record atomically.
6. Failed finalization and cancelled uploads attempt to remove the incomplete Storage object.

### Security controls

- Supabase Row Level Security protects profiles, files, roles, and Storage objects.
- Authenticated clients cannot directly insert or update vault objects.
- Storage paths are namespaced by user ID.
- Executable and server-interpreted file types are rejected.
- Files are private by default.
- Shared files use explicit visibility controls and signed download URLs.
- Client-provided file size is never trusted for the final database record.

### Error handling

Expected failures are surfaced through inline upload status and toast notifications, including:

- Invalid file type
- File larger than 1 GB
- Insufficient remaining quota
- Cancelled upload
- Failed Storage upload
- Failed upload finalization
- Unauthorized file access

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
```

`npm run build` is the production compilation check. The repository may contain existing Prettier formatting drift reported by the full lint command; this does not prevent the production build.

## Important Deployment Notes

- Apply all Supabase migrations before evaluating uploads.
- Configure OAuth callback URLs in Supabase when testing Google or GitHub login.
- Configure server-only Supabase environment variables in the deployment platform.
- Rotate any accidentally exposed credentials before production use.
- A scheduled reconciliation job is recommended to remove Storage objects left behind by browser or device disconnects before finalization.

## Evaluation Summary

Vaultra is designed to demonstrate the assignment's core requirements:

- Authenticated registration and login
- Private, owner-only file storage
- Public sharing through controlled links
- Uploads of at least 100 MB with progress reporting
- Server-side validation and actual-size verification
- Atomic quota enforcement
- File management and responsive dashboard UI
- Clear setup documentation and production-oriented error handling
