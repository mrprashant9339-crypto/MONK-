# MONK GA4 setup and conversion measurement

GA4 is optional and consent-gated. The production bundle does not load Google Analytics until a visitor explicitly accepts optional analytics. If the Measurement ID is missing or still the placeholder `G-XXXXXXXXXX`, the GA script remains inactive even after consent.

## Configure the Measurement ID

1. Create or open the MONK web data stream in Google Analytics 4.
2. Copy its Measurement ID (format: `G-XXXXXXXXXX`, with ten letters/numbers after `G-`).
3. Add a GitHub Actions repository secret named `VITE_GA4_MEASUREMENT_ID` with that exact value.
4. Run the Cloudflare deployment workflow again. The ID is injected at build time; it is not a runtime Worker secret.
5. Open the site in a fresh browser session. Reject optional analytics and verify that no request to `googletagmanager.com` occurs. Then accept analytics and verify that the GA4 script loads.
6. Use GA4 Realtime or DebugView to confirm events after consent.

Do not paste the Measurement ID into source code or commit it as a repository secret. The Measurement ID is not an API key, but managing it as a deployment setting makes activation and rollback explicit.

## Conversion events

After a valid support submission, MONK stores a one-time session marker and sends `generate_lead` only when optional analytics consent is active. A completed account signup sends `sign_up` under the same consent condition. A direct visit to `/thank-you` without a successful submission context does not create either conversion event. The page itself remains `noindex, nofollow` and is not listed in the sitemap.

In Google Analytics:

1. Open **Admin → Data display → Events**.
2. Find `generate_lead` and switch **Mark as key event** on.
3. Find `sign_up` and switch **Mark as key event** on if account registrations are also a conversion goal.
4. Verify the events in Realtime or DebugView after a consented test submission.

If you prefer a page-view-based event instead, create a custom event from `page_view` where `page_location` contains `/thank-you`, then mark that custom event as a key event. This method can count direct visits to the thank-you URL; the built-in `generate_lead` event is more reliable because it requires a successful submission context.

## Current release status

- GA4 integration: implemented, consent-gated.
- Real Measurement ID: not supplied/configured in the repository context at the time this document was written.
- Analytics collection: inactive until the real ID is configured and a visitor opts in.
- Consent banner: displayed to all public-site visitors, including EU, UK and Swiss visitors. This is stricter than showing it only to those regions.
