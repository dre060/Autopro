# Auto Pro app — Google Play & App Store release

App: **Auto Pro** · package / bundle ID **com.autoprorepairs.admin** · version in `pubspec.yaml`.
Store graphics are in `mobile/store/`. Privacy policy: https://www.autoprorepairs.com/privacy
(account deletion: https://www.autoprorepairs.com/privacy#delete-account).

## Which track to use

Auto Pro is a staff-only app (you and Keith). Both stores have a way to ship a private app without a
public listing, and it is much less paperwork than a public release:

| | Google Play | Apple |
|---|---|---|
| **Recommended** | **Internal testing** track — up to 100 testers by email, live in minutes, no 14-day test rule | **TestFlight internal testing** — up to 100 people on your App Store Connect team, no App Review |
| Public later | Production (personal accounts must first run a closed test with 12 testers for 14 days; organization accounts skip that) | App Review → **Unlisted** distribution (only people with the link can find it) |

Everything below is ready for either choice.

## Accounts

The app is published under Andre's existing organization accounts (the privacy policy says so):

1. **Google Play Console** — *Lennox Digital* (organization account, ID 6532326622935845830), so no 12-tester rule.
2. **Apple Developer Program** — *Lennox Digital Labs LLC*, Team ID 8Y2GRSNQMG.
3. **Codemagic** (free tier is enough) — builds the iPhone app on a Mac for you, since this PC can't.
4. **A reviewer login** — Apple (and Google, for production) need a working sign-in to review a staff app.
   Create an employee login for review (role *technician* or *manager*) and put it in the review notes.
   Don't use your own password.

## Google Play — step by step

1. Play Console → **Create app**: name *Auto Pro*, App, Free.
2. **App signing**: choose *Use Google-generated key*. Upload `build/app/outputs/bundle/release/app-release.aab`
   (it is signed with `android/autopro-release.jks`, which becomes your **upload key** — back it up with its password).
   - Your phone has the sideloaded copy. Uninstall it once before installing from Play, because Google signs Play
     copies with a different key.
3. **Testing → Internal testing** → add testers (your Gmail + Keith's) → create release → upload the .aab → roll out.
   Share the opt-in link it gives you.
4. **Store listing** (text below), graphics:
   - App icon: `store/play-icon-512.png`
   - Feature graphic: `store/play-feature-graphic-1024x500.png`
   - Phone screenshots: 2–8 (see *Screenshots* below)
5. **App content**:
   - Privacy policy: https://www.autoprorepairs.com/privacy
   - App access: *All or some functionality is restricted* → give the reviewer login
   - Ads: *No*
   - Content rating questionnaire: Category *Utility/Productivity*; answer No to everything → rated Everyone
   - Target audience: 18+
   - Data safety: see below
   - Government app / financial features / health: No
   - Account deletion URL: https://www.autoprorepairs.com/privacy#delete-account

### Google Play — Data safety answers

- Collects data: **Yes**. Shared with third parties: **No** (service providers don't count as sharing).
- Encrypted in transit: **Yes**. Users can request deletion: **Yes**.
- Data types (all *Collected*, purpose *App functionality*, required):
  - Personal info: Name, Email address, Phone number, Address (customer records staff enter)
  - Financial info: Purchase history (invoices/payments)
  - Photos: Photos (receipt pictures)
  - Files and docs: Files and docs (customer signatures, receipts)
  - App activity: Other user-generated content (job notes)
  - Location: **No**. Device IDs: **No**.

## Apple — step by step

1. developer.apple.com → **Identifiers** → register App ID `com.autoprorepairs.admin`.
2. App Store Connect → **My Apps → +** → New App: iOS, name *Auto Pro* (if taken, *Auto Pro Shop Manager*),
   bundle ID `com.autoprorepairs.admin`, SKU `autopro-admin`.
3. App Store Connect → Users and Access → **Integrations → App Store Connect API** → generate a key (role
   *App Manager*). Download the .p8 once.
4. Codemagic → add the GitHub repo → Team integrations → **App Store Connect** → add that key, name it
   **AutoPro ASC** → Code signing identities → generate an iOS distribution certificate + App Store profile.
5. Run the **iOS → TestFlight** workflow from `codemagic.yaml` (or push a tag like `app-v2.0.1`). About 15 min later
   the build shows up in TestFlight.
6. TestFlight → Internal testing → add yourself and Keith → install the **TestFlight** app on the iPhone.

For a public/unlisted release later: fill in the listing below, App Privacy answers, screenshots, the reviewer login,
then **Submit for Review**, and request **Unlisted app distribution** from Apple's form.

### Apple — App Privacy answers

- Data used to track you: **No**.
- Data linked to the user, purpose *App Functionality*: Contact Info (name, email, phone, address), Financial Info
  (other financial info — invoices), User Content (photos, other user content), Identifiers (user ID).
- Export compliance: already set in Info.plist (`ITSAppUsesNonExemptEncryption = false`, HTTPS only).

## Listing text (both stores)

**Name:** Auto Pro
**Subtitle (Apple, 30):** Shop manager for Auto Pro
**Short description (Play, 80):** Jobs, invoices, signatures, expenses and time clock for Auto Pro Repairs staff.

**Full description:**

> Auto Pro is the shop app for the team at Auto Pro Repairs Sales & Services in Leesburg, Florida. It is for
> Auto Pro employees and needs a staff login.
>
> • Today at a glance — appointments, jobs in the shop, money owed and what's due
> • Repair orders, estimates and invoices — add labor and parts, take payments, and convert an estimate to an invoice
> • Customer signatures — customers sign right on the screen to approve repairs or accept an invoice
> • Text or email the customer when their vehicle is ready
> • Customers and vehicles — history, VIN decoding, call or text in one tap
> • Snap a receipt — photograph a receipt and the amount, vendor and date are filled in
> • Bills, mileage log and Florida sales-tax summary
> • Time clock and a no-prices job view for technicians

**Category:** Business (Play: Business) · **Keywords (Apple):** auto repair,shop,invoice,estimate,mechanic,time clock,receipts
**Support URL:** https://www.autoprorepairs.com/contact · **Marketing URL:** https://www.autoprorepairs.com
**Contact email:** service@autoprorepairs.com · **Phone:** (352) 339-5181

**Review notes (both):**
> Auto Pro is an internal app for employees of Auto Pro Repairs Sales & Services LLC. Accounts are created by the
> shop owner; there is no public sign-up. Use the login below to review. Camera access is only used when the user
> taps "Snap receipt".
> Email: (reviewer login) · Password: (reviewer password)

## Screenshots

- **Play:** 2–8 phone screenshots, PNG/JPEG, sides 320–3840 px, long side no more than 2× the short side.
- **Apple:** at least 3 for 6.9" iPhone (1320 × 2868) — iPad screenshots are needed only if iPad is supported.

Store screenshots are public, so they must not show real customers. Sign in with the reviewer login on the emulator
and Claude will capture the screens and frame them at both stores' sizes.

## Every update

1. Raise `version:` in `pubspec.yaml` (e.g. `2.0.2+4` — the number after `+` must always go up).
2. Android: `flutter build appbundle --release` → upload the .aab to the same track.
3. iPhone: push a tag `app-v2.0.2` (or press Start in Codemagic).
