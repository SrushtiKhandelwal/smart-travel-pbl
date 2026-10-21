# Smart Travel Management System (SE PBL)

Individual SE lab project by Srushti Khandelwal. Two modules, built with Next.js, Prisma and SQLite:

1. Login, register and profile (password rules, account lock after 5 wrong tries)
2. Booking and sandbox payment (PENDING -> CONFIRMED, failed payment stays PENDING and can be retried, cancel with refund record)

No real payments. Payment is a sandbox: card token `tok_ok` succeeds, `tok_fail` is declined.

## Run it

You need Node.js 20 or newer.

```
npm install
npm run setup
npm run dev
```

Open http://localhost:3000

`npm run setup` creates the local database and adds sample services. Run it once.

## Run the tests (70 tests)

Start the app in one terminal (`npm run dev -- -p 3100`), then in another:

```
STP_BASE_URL=http://localhost:3100 npm test
```

## Demo order (3 minutes)

1. Register with a weak password (rejected), then a strong one like `Passw0rd!`
2. Log in
3. Pick a service and book it (status PENDING)
4. Pay with the sandbox card (status CONFIRMED)
5. Try `tok_fail` on another booking: it stays PENDING, retry works
6. Cancel a paid booking: a refund record is created
