# Auto Pro admin — go-live checklist

## 1. Rotate the leaked keys (do this first)
`frontend/.env.local` was committed to this **public** GitHub repo, so these
keys are exposed in git history and must be replaced:

- **Supabase** (project "Auto pro", `txvhdybrezkljpzzmppm`) → Project Settings → API Keys:
  rotate/disable the legacy `service_role` key. The app no longer uses it.
- **Resend** → API Keys: delete the old key and create a new one.

## 2. Fix the Vercel environment variables
Vercel → project `autopro` → Settings → Environment Variables (Production + Preview):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://txvhdybrezkljpzzmppm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key from Supabase → API Keys (`sb_publishable_…`) |
| `RESEND_API_KEY` | the new Resend key |

**Delete** `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_RESEND_API_KEY`
(the second one ships your email key to every visitor's browser).

The current anon key in Vercel is invalid: every database call from the live
site gets `401 Invalid API key`, so appointments and messages are not being saved.

After redeploying, open `https://www.autoprorepairs.com/api/health`; every
check should be `true` and `ok: true`. The same checks are on Admin → Settings.

## 3. Supabase Auth settings
Authentication → URL Configuration:
- Site URL: `https://www.autoprorepairs.com`
- Redirect URLs: add `https://www.autoprorepairs.com/admin/login` and
  `https://*-autopro*.vercel.app/admin/login` (preview deployments)

## 4. First sign-in (each admin, once)
1. Go to `/admin/login` → "Email me a link" → enter your email.
2. Open the link on the same device. That creates and signs in your account.
3. Admin → Settings → set a password if you'd rather not use links.

Allowed admins: `service@autoprorepairs.com`, `andrelewis1533@gmail.com`
(table `admin_users`; access also requires a verified email).

After both admins have signed in once, turn **off** "Allow new users to sign up"
in Supabase → Authentication → Sign In / Providers.

## 5. Review defaults in Admin → Settings
Labor rate ($120/hr), sales tax (7% = FL 6% + Lake County 1%, parts and fees
taxable, labor not), warranty and estimate terms. These were placeholders;
confirm them, and confirm the tax treatment with your accountant.

## 6. Invoicing & QuickBooks
- **Invoice numbers** continue from QuickBooks: the next invoice is **#1097**
  (your last QuickBooks invoice we saw was #1096). If you've issued later ones
  in QuickBooks, change it in Settings → Invoicing → Next invoice number.
  Repair orders keep their own RO numbers (#1001…).
- Settings → Invoicing: default terms, your online **Pay now** link (Square,
  Stripe, PayPal or QuickBooks Payments) and payment instructions.
- Export customers (e.g. Wheels and Wheels): edit the customer → country,
  default terms (Net 30) and **Tax-exempt** with the reason. New invoices for
  them start at 0% tax.
- **QuickBooks export** (sidebar → QuickBooks export):
  - *Online:* import the customers CSV, then the invoices CSV (⚙ → Import data).
    Turn on Custom transaction numbers in QBO first so invoice numbers carry
    over. Payments can't be imported into QBO from a file; use the payments
    list with "Receive payment".
  - *Desktop:* one IIF file with customers, invoices and payments. Back up first.
  - Click **Mark exported** after QuickBooks accepts a file so it isn't imported twice.
  - Settings → QuickBooks mapping must match your QuickBooks item and account names.

## 7. The Auto Pro Admin app
The admin panel installs as an app (PWA); no app store needed.
- **iPhone/iPad:** open `https://www.autoprorepairs.com/admin` in **Safari** →
  Share → **Add to Home Screen**. Open it from the Home Screen icon.
- **Android / computer:** open `/admin` in Chrome or Edge → **Install the Auto Pro app**
  (bottom of the sidebar) or the browser's Install button.
- Then Settings → **This device** → Push notifications → **Turn on**, and tap **Test**.
  You'll get alerts for new appointment requests, website messages, and estimates
  customers approve or decline.

Push keys were generated and added to `frontend/.env.local` (not in git).
Copy these **four** into Vercel → Environment Variables (Production + Preview):
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_SECRET`.

### Telling customers their car is ready
When a job moves to **Ready for pickup** (button, status menu, or dragging the
card), the app asks to notify the customer: automatic text, text from your own
phone (opens Messages with the text filled in, no setup), and/or email. Turn on
Settings → Customer notifications → *Notify automatically* to skip the question.
The message links to a page where the customer sees live progress
(Approved → In progress → Ready → Picked up) and the invoice.

**Automatic texts (optional):** create a Twilio account and add
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` in Vercel.
US business texting requires registering the number for A2P 10DLC in Twilio
(a short form; carriers block unregistered business texts). Until then, use
"Text from my phone".

## 8. Android app (Galaxy Fold / any Android phone)
`android/` builds a real Android app (Trusted Web Activity) that opens the admin
full screen in Chrome's engine: push alerts, receipt camera and offline mode keep
working, and every website deploy updates the app automatically.

- Install: copy `AutoPro-Admin.apk` to the phone (USB, Google Drive, email to
  yourself), tap it, allow "Install unknown apps" for that app once, then Install.
- The address bar disappears once the site is deployed with
  `frontend/public/.well-known/assetlinks.json` (already added).
- Rebuild: `cd android && ./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`.
- **Back up `android/autopro-release.jks` and `android/keystore.properties`**
  (not in git). Updates and the Play Store need that same key.

## Database migrations
All schema changes are in `supabase/migrations/` and are already applied to
the live project.
