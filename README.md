# Paid&Due website and Android App Links

This GitHub Pages site hosts the Android Digital Asset Links declaration and the click-gated Supabase email callback pages for Paid&Due.

- Android App Link callback: /paiddue
- Email verification/recovery landing page: /paiddue/continue
- Browser fallback when the Android app is not installed: /paiddue/
- Android association: /.well-known/assetlinks.json

See [AUTH_EMAIL_TEMPLATES.md](AUTH_EMAIL_TEMPLATES.md) for the required Supabase Confirm signup and Reset password email templates. The templates must use {{ .TokenHash }} and must not link directly to {{ .ConfirmationURL }} for these flows.
