# TASK-044 Supabase setup

The app remains anonymous and local-first until a person explicitly signs in to sync. In the Supabase Dashboard, open **SQL Editor**, paste and run [`supabase/migrations/20260910_task044_privacy.sql`](../supabase/migrations/20260910_task044_privacy.sql), then add only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`. Do not add a service-role key to the browser or repository.

Rows use `owner_id` plus Row Level Security, so an authenticated user can access only their own `decision_sessions`. Local records are not uploaded automatically: the product presents a count and requires an explicit click before sync. On restore, a newer local record wins over an older cloud copy, so an existing browser record is never silently overwritten. Export remains available without login.

## Creator Studio (TASK-045)

After the TASK-044 migration, run [`supabase/migrations/20260911_task045_creator_studio.sql`](../supabase/migrations/20260911_task045_creator_studio.sql). This adds the version catalog, immutable release audit and role-gated policies. Bootstrap the first admin only after that person has signed in once; the exact SQL and role boundaries are in [`docs/CREATOR-STUDIO.md`](CREATOR-STUDIO.md). Do not grant creator roles through the browser or use an anon key to bypass RLS.
