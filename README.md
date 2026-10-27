# Smart Travel Management System (SE PBL)

Individual SE lab project by Srushti Khandelwal, built with Next.js, React, Prisma, and SQLite.

The project covers registration, login, profile editing, service browsing, bookings, and sandbox payments. Bookings move from `PENDING` to `CONFIRMED` after a successful sandbox payment. A failed payment leaves the booking pending so it can be retried or cancelled. Cancelling a paid booking records a sandbox refund. No real charges or card details are used.

## Run locally on Windows (PowerShell)

You need Node.js 20 or newer. From a fresh checkout:

```powershell
Set-Location 'C:\Users\srush\OneDrive\Desktop\smart-travel-pbl'
npm install
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
npm run setup
npm run dev
```

Open <http://localhost:3000>. Keep the `npm run dev` terminal open. The `.env` file and `prisma/dev.db` are local and ignored by Git. Set a private `SESSION_SECRET` in `.env`; do not commit or share it.

`npm run setup` creates the SQLite schema and adds missing sample services. It does not erase existing travelers, bookings, payments, or edited services. If you already have a working database, you can simply run `npm install` and `npm run dev`.

## Demo flow

1. Register with a weak password to see validation, then use a strong password.
2. Log in and select an available service and travel date.
3. Book it and see `PENDING` in My trips.
4. Click **Pay in sandbox** to record a successful demo payment and see `CONFIRMED`.
5. On another booking, click **Test declined payment** to see the booking stay `PENDING`; retry or cancel it.
6. Cancel a confirmed booking to record a sandbox refund.

## Tests (isolated database only)

The integration suite clears traveler, booking, and payment rows. Its guard refuses to run without an explicit test-only database URL. Stop the normal dev server before starting a test server from this checkout.

In PowerShell terminal 1:

```powershell
Set-Location 'C:\Users\srush\OneDrive\Desktop\smart-travel-pbl'
$env:DATABASE_URL = 'file:./stp-test-local.db'
npx prisma db push
npx tsx prisma/seed.ts
npm run build
$env:PORT = '3100'
npm run start
```

In PowerShell terminal 2:

```powershell
Set-Location 'C:\Users\srush\OneDrive\Desktop\smart-travel-pbl'
$env:DATABASE_URL = 'file:./stp-test-local.db'
$env:STP_TEST_DATABASE = '1'
$env:STP_BASE_URL = 'http://localhost:3100'
npm test
```

The test file is `prisma/stp-test-local.db`. Do not point these commands at `prisma/dev.db`.
