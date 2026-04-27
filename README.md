# NestMates

**Your Community, Connected Globally**

NestMates is a trusted platform for immigrants and international students to find housing, share rides, and discover community events — wherever life takes them.

🌐 **nestmates.com/usa** · **/canada** · **/uk** · **/germany** · **/australia**

---

## What is NestMates?

NestMates connects people who are new to a country or city with their community. It's built around three core services:

- 🏠 **Accommodation** — Find apartments, shared homes, and roommates in your area
- 🚗 **Ride Share** — Share rides to airports, grocery stores, or anywhere you need to go
- 🎉 **Events & Personal Ads** — Discover local meetups, cultural festivals, and community services

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Prisma 5 + SQLite (development) / PostgreSQL (production)
- **Auth:** JWT cookie sessions (bcryptjs + jose)
- **UI:** Tailwind CSS, Radix UI, Framer Motion
- **Email:** Nodemailer (SMTP)
- **Real-time:** Socket.IO (polling fallback)
- **State:** Zustand

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# JWT session cookie
JWT_SECRET="your-jwt-secret-here"

# Message encryption
ENCRYPTION_KEY="your-32-char-encryption-key-here"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@email.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="NestMates <noreply@nestmates.com>"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cron job protection (optional)
CRON_SECRET=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
npm run db:push     # Push schema to DB
npm run db:seed     # Seed countries and states
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed initial data |
| `npm run cleanup:scheduled` | Run post lifecycle cleanup |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/               # REST API handlers
│   ├── accommodation/     # Accommodation listings
│   ├── rides/             # Ride share listings
│   ├── events/            # Events & personal ads
│   ├── messages/          # Chat/messaging
│   ├── my-posts/          # User's own posts
│   ├── select-location/   # Country/state picker
│   └── select-service/    # Service selector
├── components/            # React components
│   ├── auth/              # Auth panel
│   ├── layout/            # Dashboard layout, navigation
│   ├── messages/          # Chat panel, message indicator
│   └── ui/                # Primitive UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Server utilities
│   ├── auth/              # Session, OTP, NextAuth config
│   ├── jobs/              # Cleanup cron job
│   ├── security/          # Rate limiting, sanitization
│   └── socket/            # Socket.IO setup
└── types/                 # TypeScript type augmentations
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed data (countries + states)
```

---

## Post Lifecycle

| Post Type | Active Duration | Chat Retention After Deletion |
|-----------|----------------|-------------------------------|
| Accommodation | 3 months | 30 days |
| Ride Share | 1 month | 30 days |
| Events | Optional expiry | N/A |

Expiry notification emails are sent at 1 month, 1 week, and 1 day before deletion.

---

## Supported Countries

| Country | Flag |
|---------|------|
| United States | 🇺🇸 |
| Canada | 🇨🇦 |
| United Kingdom | 🇬🇧 |
| Germany | 🇩🇪 |
| Australia | 🇦🇺 |

---

## License

Private — All rights reserved © 2025 NestMates
