# TASK-044 Supabase setup

The app remains anonymous and local-first until a person explicitly signs in to sync. In the Supabase Dashboard, open **SQL Editor**, paste and run [`supabase/migrations/20260910_task044_privacy.sql`](../supabase/migrations/20260910_task044_privacy.sql), then add only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`. Do not add a service-role key to the browser or repository.

Rows use `owner_id` plus Row Level Security, so an authenticated user can access only their own `decision_sessions`. Local records are not uploaded automatically: the product presents a count and requires an explicit click before sync. On restore, a newer local record wins over an older cloud copy, so an existing browser record is never silently overwritten. Export remains available without login.
