This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deployment Notes

### Environment Variables
For the system to function correctly (especially the bootstrap and commercial logic), ensures these variables are set in both Production and **Preview** environments:
- `DATABASE_URL`: Prisma connection string. (Recommended: use a separate DB for Preview/Staging).
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project credentials.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Stripe integration.
- `INTERNAL_WORKER_SECRET`: Token for internal background workers.

### Database Migrations
The build process automatically runs `prisma migrate deploy`. This ensures the target database schema matches the Prisma client.
If you encounter a `SCHEMA_MISMATCH` (Prisma P2022/P2021) error:
1. Verify that `DATABASE_URL` is correct.
2. Ensure the database user has permissions to run migrations.
3. If using a shared DB for multiple branches, be careful with destructive changes.

### Vercel Preview
If `/start` or `/dashboard` show technical errors in a Preview branch, check that the `DATABASE_URL` is correctly configured for that specific deployment.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
