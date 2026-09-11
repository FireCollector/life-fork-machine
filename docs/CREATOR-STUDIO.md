# Creator Studio

Creator Studio is the content operations path for candidate ScenarioPacks. It does not alter an active player's session and it never turns a model draft into published content automatically.

## Editorial flow

1. In `/topic-lab`, generate a candidate only after a decision brief and at least three traceable sources are ready.
2. Choose **交给 Creator Studio**. The browser carries the candidate and its source snapshot once; it does not publish anything.
3. An editor checks the JSON, source snapshot, repeated actions and the field-level changes from the AI/rules draft. They save a cloud draft, then submit it for review.
4. A publisher or admin publishes a reviewed version, or retires a published version. Published and retired content cannot be edited in place; create a new draft from the historical version instead.

## Roles

| Role        | Can do                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| `editor`    | Create/edit working drafts; submit and return review                     |
| `publisher` | All editor actions; publish reviewed versions; retire published versions |
| `admin`     | Full editorial workflow; role bootstrap remains a database-owner action  |

Roles are stored by Supabase user ID and enforced by RLS. There is intentionally no browser UI for granting a role.

## Enable it in Supabase

Run [`supabase/migrations/20260911_task045_creator_studio.sql`](../supabase/migrations/20260911_task045_creator_studio.sql) in the Supabase SQL Editor. Then sign in once at `/creator` or `/privacy`, and run this as the database owner with your own email substituted:

```sql
insert into public.creator_roles (user_id, role)
select id, 'admin' from auth.users where email = 'your-email@example.com'
on conflict (user_id) do update set role = excluded.role;
```

Use a publisher role for people who can make content public and editor for people who can only prepare it. The `scenario_release_audit` table records creation, review submission, return, publication and retirement with actor, time and stated reason.

## Version and session boundary

Each published item is an immutable version under one `scenario_key`. A later correction is a new version, not an overwrite. Existing user decision sessions already contain their own game-state snapshots, so content operations cannot rewrite past choices or reports. Integrating a published Candidate ScenarioPack as a new playable runtime scenario is deliberately a later compilation task; it must preserve this same version reference.

The imported AI/规则初稿 and source snapshot are immutable from the moment a draft is created. Editors can change only the working pack and stated reason, which keeps the displayed diff and audit trail meaningful.
