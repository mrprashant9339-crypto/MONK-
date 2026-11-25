# MONK Notifications

The notification centre reuses `public.notifications`; it does not introduce a second notification store.

## Data access
- Reads are scoped by both the active organization and the signed-in user.
- The existing SELECT RLS policy remains in place.
- The migration adds an UPDATE policy scoped to the same organization and user.
- Authenticated clients receive column-level UPDATE permission for `read_at` only. Notification content remains server-managed.
- Postgres Changes is enabled for the existing table through the managed `supabase_realtime` publication.

## UI
- Displays the latest 30 notifications, newest first.
- Shows an unread badge, per-item read action, mark-all-read and manual refresh.
- Subscribes to INSERT events filtered by the signed-in user and reloads through the RLS-protected query.
- If the database migration has not been applied, the list remains available but live updates/read actions may return an error.

## Deployment
Migration `20261124174718_notifications_read_state_and_realtime.sql` has been applied to Supabase project `yucwackrbekwaxiyuobt` and verified: the scoped UPDATE policy exists and `public.notifications` is included in `supabase_realtime`.
