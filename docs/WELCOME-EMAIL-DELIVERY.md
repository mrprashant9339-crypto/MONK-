# MONK Welcome Email Delivery

## Behaviour
- Password signup adds `flow=signup` to the confirmation callback URL. The welcome email is requested only after the callback has exchanged the confirmation code, the user's legal consent/profile setup has completed, and the server confirms `email_confirmed_at`.
- Google OAuth signup stores an explicit `flow=signup` marker with the onboarding context. Google sign-in for an existing account uses `flow=login` and does not trigger a welcome email.
- The Edge Function independently validates the caller's access token and confirmed email. It never accepts a recipient address or user ID from the browser.
- `email_delivery_events` enforces one welcome email per Auth user. A database claim RPC prevents concurrent duplicate sends; failed deliveries can be retried, and stale sending claims can be recovered after five minutes.
- Email provider failures are logged and do not invalidate a verified account or block dashboard access.

## Sender and secrets
Configure these in Supabase Dashboard → Edge Functions → Secrets:
- `RESEND_API_KEY`: Resend API key with email-send permission.
- `MONK_EMAIL_FROM`: verified sender, expected value `MONK Support <support@monk.monster>`.
- `MONK_APP_URL`: `https://monk.monster`.
- `MONK_SUPPORT_EMAIL`: `admin@monk.monster` until a `support@monk.monster` mailbox/forwarding alias is provisioned (optional).
- Supabase-managed `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS` (or `SUPABASE_ANON_KEY`) and `SUPABASE_SECRET_KEYS` (or `SUPABASE_SERVICE_ROLE_KEY`) are required by the function runtime.

The Resend sender domain must be verified and its SPF/DKIM records must pass. Do not replace MX records used by Hostinger Mail. Keep the Supabase Auth SMTP configuration separate: confirmation and password-reset emails are sent by Supabase Auth SMTP, while this Edge Function sends the post-verification welcome email through Resend.

## Deployment
1. Review and merge the feature branch only after GitHub CI passes.
2. Apply migration `20261125143000_welcome_email_delivery.sql` to production using the tracked migration process.
3. Deploy Edge Function `send-welcome-email` with JWT verification enabled.
4. Set the secrets listed above.
5. In Supabase Auth → Email Templates / SMTP Settings, verify that confirmation and recovery emails use the approved custom SMTP sender `support@monk.monster`. Do not assume the Resend Edge Function changes Auth SMTP settings.
6. Test with a fresh controlled mailbox. Confirm verification email, callback, exactly one welcome email, dashboard link and support reply address.
7. Repeat the callback and invoke the function again; verify no duplicate welcome message.
8. Test Resend rejection/temporary failure and confirm the email event is marked failed and can be safely retried.

## Acceptance criteria
- Unverified users cannot trigger the welcome email.
- Existing users logging in do not receive a welcome email.
- New email/password and Google signup users receive one welcome email after verification.
- Repeated callback/function requests do not create duplicate sends.
- User account activation is not rolled back if the email provider is temporarily unavailable.
- No service-role/secret key or Resend API key is shipped to the browser.
