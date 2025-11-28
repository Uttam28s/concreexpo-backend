# Backend Deployment Checklist

## Pre-Deployment

- [ ] All environment variables documented
- [ ] Database migrations tested locally
- [ ] Build process tested (`npm run build`)
- [ ] Start command tested (`npm start`)
- [ ] CORS configured for production frontend URL
- [ ] JWT secrets generated (strong random strings)
- [ ] MSG91 credentials configured

## Environment Variables Required

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (min 32 chars)
- `FRONTEND_URL` - Frontend production URL
- `MSG91_AUTH_KEY` - MSG91 API key
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password
- `ADMIN_PHONE` - Admin user phone number

### Optional (with defaults)
- `NODE_ENV` - `production`
- `PORT` - `3001`
- `JWT_EXPIRES_IN` - `7d`
- `JWT_REFRESH_EXPIRES_IN` - `30d`
- `SMS_PROVIDER` - `msg91`
- `MSG91_SENDER_ID` - `CNCEXP`
- `MSG91_ROUTE` - `4`
- `RATE_LIMIT_WINDOW` - `900000` (15 minutes)
- `RATE_LIMIT_MAX` - `100`
- `OTP_RATE_LIMIT_MAX` - `5`
- `OTP_EXPIRY_MINUTES` - `15`
- `OTP_LENGTH` - `6`
- `WORKER_VISIT_OTP_EXPIRY_HOURS` - `24`

## Post-Deployment

- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed database: `npx prisma db seed` (or run seed script)
- [ ] Test API endpoints
- [ ] Verify CORS is working
- [ ] Test authentication flow
- [ ] Monitor logs for errors

## Generate JWT Secrets

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

