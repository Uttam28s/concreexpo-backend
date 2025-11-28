# Backend API - Wall & Flooring Management System

Express.js + TypeScript + Prisma backend API for the Wall & Flooring Business Management System.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client
│   │   └── env.ts           # Environment configuration
│   ├── controllers/
│   │   └── auth.controller.ts  # Authentication logic
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT authentication
│   │   └── error.middleware.ts # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts      # Auth routes
│   │   └── index.ts            # Route aggregator
│   ├── services/
│   │   └── sms.service.ts      # SMS/Twilio integration
│   ├── utils/
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── otp.ts              # OTP generation
│   │   └── password.ts         # Password utilities
│   └── index.ts                # Server entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Seed data
│   └── migrations/          # Database migrations
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
├── tsconfig.json
└── nodemon.json
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:push` | Push schema changes to database |
| `npm run prisma:seed` | Seed database with initial data |

## 🗄️ Database Setup

### PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Create Database

```bash
# Access PostgreSQL
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE flooring_db;
CREATE USER flooring_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE flooring_db TO flooring_user;
\q
```

Update `.env`:
```env
DATABASE_URL="postgresql://flooring_user:your_password@localhost:5432/flooring_db"
```

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

### Database
```env
DATABASE_URL="postgresql://user:password@localhost:5432/flooring_db"
```

### JWT
```env
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_REFRESH_EXPIRES_IN="30d"
```

### SMS (Twilio)
```env
SMS_PROVIDER="twilio"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

### Application
```env
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### Admin Credentials
```env
ADMIN_EMAIL="admin@wallfloor.com"
ADMIN_PASSWORD="Admin@123456"
ADMIN_PHONE="+919876543210"
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh` | Refresh access token | No |
| GET | `/me` | Get current user | Yes |
| PUT | `/change-password` | Change password | Yes |

### Health Check

```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

## 🔒 Authentication Flow

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@wallfloor.com",
  "password": "Admin@123456"
}
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@wallfloor.com",
    "phone": "+919876543210",
    "role": "ADMIN"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Using the Token

Include in header:
```
Authorization: Bearer <accessToken>
```

Or cookies are automatically set for browser requests.

## 🛠️ Development

### Adding New Routes

1. Create controller in `src/controllers/`:
```typescript
// src/controllers/client.controller.ts
export const getClients = async (req: Request, res: Response) => {
  // Implementation
};
```

2. Create routes file in `src/routes/`:
```typescript
// src/routes/client.routes.ts
import { Router } from 'express';
import { getClients } from '../controllers/client.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

const router = Router();
router.get('/', authenticate, getClients);

export default router;
```

3. Add to main router in `src/routes/index.ts`:
```typescript
import clientRoutes from './client.routes';
router.use('/clients', clientRoutes);
```

### Database Migrations

When you modify `prisma/schema.prisma`:

```bash
# Create and apply migration
npm run prisma:migrate

# Name your migration
# Enter name: add_client_notes_field
```

## 📊 Database Models

Main models in the system:

- **User**: Admin and Engineer users
- **Client**: Client/site information with contact details
- **ClientType**: Categories for clients
- **Material**: Material inventory items
- **Appointment**: Engineer visit appointments with OTP
- **InventoryTransaction**: Stock In/Out records
- **WorkerVisit**: Daily worker count with OTP
- **Settings**: System configuration
- **SMSLog**: SMS delivery tracking

## 🔧 Utilities

### OTP Generation
```typescript
import { generateOTP, getOTPExpiry, isOTPExpired } from './utils/otp';

const otp = generateOTP(); // 6-digit OTP
const expiry = getOTPExpiry(); // 15 minutes from now
const expired = isOTPExpired(expiryDate);
```

### SMS Service
```typescript
import { sendSMS, sendVisitOTP } from './services/sms.service';

await sendSMS({
  to: '+919876543210',
  message: 'Your message here'
});

await sendVisitOTP(clientPhone, otp, engineerName);
```

### Password Hashing
```typescript
import { hashPassword, comparePassword } from './utils/password';

const hashed = await hashPassword('password123');
const isValid = await comparePassword('password123', hashed);
```

## 🐛 Debugging

### View Database
```bash
npm run prisma:studio
```
Opens GUI at http://localhost:5555

### Check Logs
All errors are logged to console in development.

### Test SMS Without Twilio
Temporarily modify `sms.service.ts` to mock SMS sending during development.

## 🚀 Production Deployment

### Build
```bash
npm run build
```

### Run Production
```bash
NODE_ENV=production npm start
```

### Environment
- Set all production environment variables
- Use strong JWT secrets
- Enable HTTPS
- Configure CORS for production frontend URL
- Set up database backups
- Configure monitoring (Sentry, etc.)

## 📝 Default Data (After Seed)

**Admin User:**
- Email: admin@wallfloor.com
- Password: Admin@123456

**Engineer User:**
- Email: engineer@wallfloor.com
- Password: Engineer@123

**Client Types:**
- Client, Architect, Contractor, Builder, Interior Designer, Property Developer

**Materials:**
- Wall Putty, Tile Adhesive, Grout, Leveling Compound, Primer, Waterproofing Compound, Epoxy, Sealant

**Demo Client:**
- ABC Construction (Mumbai)

## 🔐 Security Checklist

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ SQL injection prevention (Prisma)
- ✅ Input validation
- ✅ HTTP-only cookies
- ✅ Environment variables for secrets

## 🤝 Support

For issues or questions, contact the development team.

---

**Status:** Core infrastructure complete ✅
**Ready for:** Master modules development
