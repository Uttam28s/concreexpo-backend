# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the Concreexpo Backend API to Vercel.

## 🚀 Quick Start

1. **Install Vercel CLI** (optional but recommended):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard (see [Environment Variables](#environment-variables) section)

5. **Run Database Migrations**:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

That's it! Your API will be live at `https://your-project.vercel.app`

---

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have one
2. **Vercel CLI** (optional, for CLI deployment): Install globally with `npm i -g vercel`
3. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
4. **Database**: Ensure your PostgreSQL database is accessible from the internet (e.g., Supabase, Railway, Neon, etc.)

## Table of Contents

1. [Project Setup](#project-setup)
2. [Environment Variables](#environment-variables)
3. [Deployment Methods](#deployment-methods)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)

---

## Project Setup

### 1. Verify Project Structure

Ensure your project has the following files:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.ts` - Serverless function entry point
- ✅ `.vercelignore` - Files to exclude from deployment
- ✅ `package.json` - With proper build scripts

### 2. Build Scripts

Your `package.json` should have these scripts (already configured):
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "postinstall": "prisma generate"
  }
}
```

The `postinstall` script ensures Prisma Client is generated after dependencies are installed.

---

## Environment Variables

### Required Environment Variables

You need to set these in the Vercel dashboard:

#### Server Configuration
- `NODE_ENV` = `production`
- `PORT` = `3000` (Vercel handles this automatically, but set it for consistency)
- `FRONTEND_URL` = Your frontend URL (e.g., `https://your-frontend.vercel.app`)

#### Database
- `DATABASE_URL` = Your PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Example (Supabase): `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

#### JWT Authentication
- `JWT_SECRET` = A strong random string (use `openssl rand -base64 32` to generate)
- `JWT_EXPIRES_IN` = `7d` (optional, defaults to 7 days)
- `JWT_REFRESH_SECRET` = Another strong random string
- `JWT_REFRESH_EXPIRES_IN` = `30d` (optional, defaults to 30 days)

#### SMS (MSG91)
- `SMS_PROVIDER` = `msg91`
- `MSG91_AUTH_KEY` = Your MSG91 authentication key
- `MSG91_SENDER_ID` = Your MSG91 sender ID (e.g., `CNCEXP`)
- `MSG91_ROUTE` = `4` (Transactional route)
- `MSG91_TEMPLATE_ID` = Your MSG91 template ID (optional)
- `MSG91_OTP_TEMPLATE_ID` = Your MSG91 OTP template ID

#### Admin Account
- `ADMIN_EMAIL` = Admin email address
- `ADMIN_PASSWORD` = Admin password (will be hashed on first login)
- `ADMIN_PHONE` = Admin phone number (with country code, e.g., `+919825012345`)

#### Rate Limiting (Optional)
- `RATE_LIMIT_WINDOW` = `900000` (15 minutes in milliseconds)
- `RATE_LIMIT_MAX` = `100` (max requests per window)
- `OTP_RATE_LIMIT_MAX` = `5` (max OTP requests)

#### OTP Configuration (Optional)
- `OTP_EXPIRY_MINUTES` = `15`
- `OTP_LENGTH` = `6`
- `WORKER_VISIT_OTP_EXPIRY_HOURS` = `24`

### How to Set Environment Variables in Vercel

#### Method 1: Via Vercel Dashboard (Recommended)

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select `Production`, `Preview`, and/or `Development` as needed
4. Click **Save**
5. **Important**: After adding/updating environment variables, redeploy your project

#### Method 2: Via Vercel CLI

```bash
# Set a single variable
vercel env add DATABASE_URL production

# Set multiple variables from a .env file
vercel env pull .env.production
# Edit .env.production, then:
vercel env push .env.production production
```

---

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended for First Time)

1. **Connect Your Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Select your repository

2. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty (not needed for serverless)
   - **Install Command**: `npm install`

3. **Add Environment Variables**
   - Add all required environment variables (see [Environment Variables](#environment-variables) section)
   - Make sure to set them for **Production** environment

4. **Deploy**
   - Click **Deploy**
   - Wait for the build to complete
   - Your API will be available at `https://your-project.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Your Project**
   ```bash
   vercel link
   ```
   - Follow the prompts to link to an existing project or create a new one

4. **Set Environment Variables** (if not set via dashboard)
   ```bash
   vercel env add DATABASE_URL production
   vercel env add JWT_SECRET production
   # ... add all other variables
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

   Or deploy to preview:
   ```bash
   vercel
   ```

### Method 3: Automatic Deployments (Git Integration)

Once connected via Method 1, Vercel automatically deploys:
- **Production**: Every push to `main` or `master` branch
- **Preview**: Every push to other branches and pull requests

---

## Post-Deployment

### 1. Run Database Migrations

After deployment, you need to run Prisma migrations on your production database:

```bash
# Option 1: Using Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy

# Option 2: Using Prisma directly (if DATABASE_URL is set locally)
npx prisma migrate deploy
```

**Important**: Make sure your `DATABASE_URL` environment variable is set correctly before running migrations.

### 2. Verify Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://your-project.vercel.app/health
   ```
   Should return: `{"status":"ok","message":"Concreexpo API is running"}`

2. **Check API Endpoints**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Should return: `{"status":"ok","message":"Concreexpo API is running"}`

3. **Test Authentication**
   ```bash
   curl -X POST https://your-project.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@wallfloor.com","password":"your-password"}'
   ```

### 3. Update Frontend Configuration

Update your frontend's API URL to point to your Vercel deployment:
```
https://your-project.vercel.app/api
```

### 4. Update CORS Settings

If your frontend is on a different domain, make sure `FRONTEND_URL` environment variable in Vercel matches your frontend URL.

---

## Database Migrations on Vercel

### Option 1: Run Migrations Locally (Recommended)

1. Pull production environment variables:
   ```bash
   vercel env pull .env.production
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Use Vercel Build Command

You can add migration deployment to your build process, but this is **not recommended** for production as it can cause issues with concurrent deployments.

### Option 3: Use a Migration Service

Consider using a service like [Prisma Migrate Deploy](https://www.prisma.io/docs/concepts/components/prisma-migrate) or a CI/CD pipeline to handle migrations separately.

---

## Troubleshooting

### Issue: Build Fails

**Error**: `Prisma Client not generated`

**Solution**: 
- Ensure `postinstall` script in `package.json` includes `prisma generate`
- Check that Prisma schema is valid: `npx prisma validate`

**Error**: `TypeScript compilation errors`

**Solution**:
- Run `npm run build` locally to identify errors
- Fix TypeScript errors before deploying

### Issue: Database Connection Errors

**Error**: `P1001: Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is set correctly in Vercel dashboard
2. Check if your database allows connections from Vercel's IPs (most cloud databases do by default)
3. Ensure SSL is enabled: Add `?sslmode=require` to your `DATABASE_URL`
4. Check database firewall settings

### Issue: Environment Variables Not Working

**Solutions**:
1. After adding/updating environment variables, **redeploy** your project
2. Verify variables are set for the correct environment (Production/Preview/Development)
3. Check variable names match exactly (case-sensitive)
4. Use Vercel CLI to verify: `vercel env ls`

### Issue: CORS Errors

**Error**: `Access-Control-Allow-Origin` header missing

**Solutions**:
1. Verify `FRONTEND_URL` environment variable is set correctly
2. Ensure it matches your frontend's exact URL (including protocol: `https://`)
3. Redeploy after updating environment variables

### Issue: Function Timeout

**Error**: `Function execution exceeded timeout`

**Solutions**:
1. Check `vercel.json` - `maxDuration` is set to 30 seconds (Vercel Pro plan required for >10s)
2. Optimize slow database queries
3. Consider using Vercel Pro plan for longer timeouts (up to 60s on Pro, 300s on Enterprise)

### Issue: Prisma Client Errors

**Error**: `@prisma/client did not initialize yet`

**Solutions**:
1. Ensure `postinstall` script runs `prisma generate`
2. Check that Prisma schema is included in deployment
3. Verify `prisma` directory is not in `.vercelignore`

### Issue: Rate Limiting Issues

**Solutions**:
1. Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` environment variables
2. Note: Rate limiting in serverless functions uses in-memory storage, which resets on each cold start
3. For production, consider using Redis-based rate limiting

### Viewing Logs

1. **Via Vercel Dashboard**:
   - Go to your project → **Deployments** → Click on a deployment → **Functions** tab → View logs

2. **Via Vercel CLI**:
   ```bash
   vercel logs [deployment-url]
   ```

3. **Real-time Logs**:
   ```bash
   vercel logs --follow
   ```

---

## Vercel-Specific Considerations

### Serverless Functions

- Your Express app runs as a serverless function
- Each request may be handled by a different function instance (cold starts)
- Database connection pooling: Prisma handles this automatically
- Stateless: Don't rely on in-memory state between requests

### Function Limits

- **Hobby Plan**: 10-second timeout, 100GB bandwidth
- **Pro Plan**: 60-second timeout, 1TB bandwidth
- **Enterprise**: 300-second timeout, custom bandwidth

### Build Time

- Vercel caches `node_modules` between builds
- Prisma generation happens during `postinstall`
- Builds typically take 1-3 minutes

### Custom Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL is automatically provisioned

---

## Security Best Practices

1. **Never commit `.env` files** - Use Vercel environment variables
2. **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. **Enable SSL for database** - Always use `?sslmode=require` in `DATABASE_URL`
4. **Set proper CORS origins** - Don't use `*` in production
5. **Use rate limiting** - Protect your API from abuse
6. **Keep dependencies updated** - Regularly run `npm audit` and update packages

---

## Monitoring and Analytics

Vercel provides built-in analytics:
- **Analytics**: View function invocations, duration, errors
- **Speed Insights**: Monitor API response times
- **Logs**: Real-time function logs

Access via: **Project Dashboard** → **Analytics** / **Logs**

---

## Rollback Deployment

If something goes wrong:

1. Go to **Deployments** in Vercel dashboard
2. Find the previous working deployment
3. Click **⋯** (three dots) → **Promote to Production**

---

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Prisma Documentation**: [prisma.io/docs](https://www.prisma.io/docs)

---

## Quick Reference

### Essential Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs --follow

# Pull environment variables
vercel env pull .env.production

# List environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME production
```

### Project URLs

After deployment, your API will be available at:
- **Production**: `https://your-project.vercel.app`
- **API Base**: `https://your-project.vercel.app/api`
- **Health Check**: `https://your-project.vercel.app/health`

---

**Last Updated**: 2024
**Vercel CLI Version**: Latest
**Node Version**: 18.x or higher (recommended)

