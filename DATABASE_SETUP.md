# Database Setup Guide

This app uses **SQLite** with **Turso** (cloud SQLite) for production deployment. The database setup works seamlessly with both local development and production.

## Quick Setup for Production (Turso)

### Step 1: Create a Turso Account

1. Go to [Turso's website](https://turso.tech/)
2. Sign up for a free account
3. Verify your email

### Step 2: Install Turso CLI

```bash
# On macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# On Windows (using PowerShell)
powershell -ExecutionPolicy Bypass -Command "irm https://get.tur.so/install.ps1 | iex"

# Or using npm
npm install -g @libsql/cli
```

### Step 3: Create a Database

1. Log in to Turso:
   ```bash
   turso auth login
   ```

2. Create a new database:
   ```bash
   turso db create peak-prep
   ```
   (Replace `peak-prep` with your preferred database name)

3. Get your database URL:
   ```bash
   turso db show peak-prep
   ```
   You'll see something like: `libsql://peak-prep-username.turso.io`

4. Create an auth token:
   ```bash
   turso db tokens create peak-prep
   ```
   Save this token securely - you'll need it for the connection string.

### Step 4: Set Up Your Database URL

Your `DATABASE_URL` should be in this format:
```
libsql://peak-prep-username.turso.io?authToken=your-auth-token-here
```

**For Vercel Deployment:**
1. Go to your Vercel project → Settings → Environment Variables
2. Add `DATABASE_URL` with your Turso connection string
3. Make sure to set it for **Production**, **Preview**, and **Development** environments

### Step 5: Run Database Migrations

After setting up Turso, run migrations to create all tables:

```bash
npx prisma migrate deploy
```

This will create all the necessary tables in your Turso database.

## Local Development Setup

For local development, you can use a local SQLite file:

1. Set `DATABASE_URL` in your `.env.local` file:
   ```
   DATABASE_URL="file:./dev.db"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Your database file will be created at `prisma/dev.db`

## Environment Variables

Add these to your `.env.local` (for local) and Vercel environment variables (for production):

```bash
# For local development (SQLite file)
DATABASE_URL="file:./dev.db"

# For production (Turso)
DATABASE_URL="libsql://your-db-name-username.turso.io?authToken=your-token"
```

## Database Management

### View Your Database

**Local (SQLite):**
```bash
npx prisma studio
```
This opens a web interface at `http://localhost:5555`

**Turso:**
```bash
turso db shell peak-prep
```
This opens an interactive SQL shell.

### Run Migrations

**Local development:**
```bash
npx prisma migrate dev --name migration_name
```

**Production:**
```bash
npx prisma migrate deploy
```

### Generate Prisma Client

After schema changes:
```bash
npx prisma generate
```

This is automatically run after `npm install` thanks to the `postinstall` script.

## Turso Free Tier Limits

- **500 million rows read/month**
- **100 million rows written/month**
- **256 databases**
- **2 GB storage per database**
- **200 databases per organization**

This is more than enough for most applications!

## Troubleshooting

### Connection Issues

If you're having connection issues:
1. Verify your `DATABASE_URL` is correct
2. Check that your auth token is valid (they expire after 7 days)
3. Generate a new token: `turso db tokens create peak-prep`
4. Update your `DATABASE_URL` with the new token

### Migration Errors

If migrations fail:
1. Make sure you're connected to the correct database
2. Check that the database exists: `turso db list`
3. Try running: `npx prisma migrate reset` (⚠️ **WARNING**: This deletes all data)

### Local vs Production

- **Local**: Uses `file:./dev.db` (SQLite file)
- **Production**: Uses `libsql://...` (Turso cloud)

The same code works for both! Just change the `DATABASE_URL` environment variable.

## Additional Resources

- [Turso Documentation](https://docs.turso.tech/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [LibSQL Documentation](https://libsql.org/docs)

