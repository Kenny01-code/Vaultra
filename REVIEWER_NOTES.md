# Vaultra Reviewer Notes

Vaultra is a secure file-storage and sharing service built with React, TanStack Start, Supabase, PostgreSQL, and Supabase Storage.

## Links

- Live demo: https://vaultra-one.vercel.app/
- Repository: https://github.com/Kenny01-code/Vaultra
- Local app: http://localhost:3000

## Login

Create an account through email/password sign-up. Google and GitHub OAuth are supported when enabled in Supabase. No credentials or secrets are committed; temporary reviewer credentials can be provided separately.

## Local Setup

Requirements: Node.js 18+, npm 9+, a Supabase project, and the Supabase CLI for migrations.

```bash
npm install
supabase link --project-ref your-project-ref
supabase db push
npm run dev
```

Copy `.env.example` to `.env.local` and configure the Supabase URL and publishable key. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never commit it or prefix it with `VITE_`.

Apply this migration before testing uploads:

`supabase/migrations/20260903000000_harden_uploads_and_atomic_quota.sql`

It removes direct authenticated Storage writes and enables atomic quota enforcement during finalization.

## Suggested Review Flow

1. Register or sign in.
2. Upload a file larger than 100 MB and observe progress.
3. Preview, rename, download, and delete it.
4. Make a file public and open its share link in a private window.
5. Revoke access and confirm the link no longer works.
6. Test blocked file types and files above the 1 GB per-file limit.
7. Temporarily lower a test account's `storage_quota_bytes` and test an over-quota upload.
8. Test responsive layouts and protected-route redirects after sign-out.

## Engineering Focus

- Authenticated routing, ownership checks, and Supabase Row Level Security.
- Private-by-default files with explicit public sharing.
- Server-issued signed upload URLs with browser progress reporting.
- Filename, MIME, extension, and per-file-size validation.
- Actual uploaded size read from Storage metadata; client size is not trusted.
- Atomic quota enforcement using a database function and profile-row locking.
- Cleanup attempts for cancelled uploads and failed finalization.
- Clear errors, responsive UI, and maintainable feature structure.

## Upload Flow

1. The client requests an authenticated upload ticket.
2. The server validates intent, quota, and file policy.
3. The browser uploads directly to private Storage through a short-lived signed URL.
4. `finalizeUpload` verifies the object and reads its actual size.
5. The database function atomically checks quota and creates the file record.

## Commands

```bash
npm run dev
npm run build
npm run lint
```

`npm run build` is the production compilation check. Existing repository-wide Prettier drift may be reported by `npm run lint` without preventing the build.

## Deployment Notes

- Apply all Supabase migrations before evaluating uploads.
- Configure OAuth callback URLs for social login.
- Keep server-only environment variables in the deployment platform.
- Rotate any accidentally exposed credentials before production use.
- A scheduled reconciliation job is recommended for Storage objects left by browser/device disconnects.

## Assignment Coverage

Authenticated registration/login, owner-only private storage, public share links, 100 MB+ uploads with progress, validation, quota enforcement, file management, responsive UI, documentation, and production-oriented error handling are implemented.
