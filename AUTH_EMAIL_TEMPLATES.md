# Paid&Due Supabase email templates

The static callback pages are intentionally click-gated. Do not use {{ .ConfirmationURL }} in these two templates: that URL points directly to Supabase's one-time verification endpoint, so automated email-link inspection can consume the token before the user clicks Continue.

In Supabase Dashboard → Authentication → Email Templates, update only the relevant templates after reviewing this pull request.

## Confirm signup

Subject: Verify your Paid&Due email address

    <h2>Welcome to Paid&amp;Due</h2>
    <p>Thanks for registering. Verify your email address to finish creating your Paid&amp;Due account.</p>
    <p><a href="{{ .SiteURL }}/paiddue/continue#token_hash={{ .TokenHash }}&amp;type=email">Verify email address</a></p>
    <p>If you did not create this account, you can ignore this email.</p>

## Reset password

Subject: Reset your Paid&Due password

    <h2>Reset your Paid&amp;Due password</h2>
    <p>We received a request to reset the password for your account.</p>
    <p><a href="{{ .SiteURL }}/paiddue/continue#token_hash={{ .TokenHash }}&amp;type=recovery">Continue to password reset</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>

The token hash is placed in the URL fragment. Browsers do not send fragments in the HTTP request to GitHub Pages. The page does not exchange the token during page load; it calls Supabase Auth only after the user presses the explicit Continue/Verify button.

## Required flow and limitations

1. The email link opens /paiddue/continue, which is deliberately outside the Android manifest's exact /paiddue App Link path.
2. The user presses the button. The page sends the token hash to Supabase Auth's verify endpoint using the project's public publishable key.
3. On success, the page redirects to the exact /paiddue Android App Link with the returned session in the URL fragment. The Android app can import that session using its existing callback handler.
4. If the app is not installed, GitHub Pages serves /paiddue/ as a browser fallback. Recovery users can set a new password there; signup users see a confirmation message.

The publishable key embedded in the static client is public by design. Never put a Supabase service_role key, secret API key, SMTP credential, or user password in this repository.

## Dashboard rollout checklist

- Keep the Site URL as https://guruoshan.github.io.
- Update the Confirm signup and Reset password templates to the snippets above.
- Do not alter SMTP credentials, OTP expiry, RLS, database schema, or Edge Functions as part of this change.
- Send a fresh signup confirmation and a fresh password reset email after the templates are saved. Old emails still contain the old one-time verification URL and must not be used for acceptance testing.

## Acceptance tests

- Opening the landing page without clicking must not call /auth/v1/verify.
- A fresh recovery email must open the landing page in Gmail without producing a Supabase GET /verify event merely from previewing the page.
- One explicit click must produce one successful token exchange and launch the app when installed.
- With the app absent, the browser fallback must allow a password change and show success.
- A second use of the same email link must fail safely with a generic expired/used message.
- A fresh signup email must verify once and show the confirmation state in the browser fallback or route into the app.
