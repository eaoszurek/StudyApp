# SAT Peak Prep 🏔️

A modern, AI-powered SAT preparation platform with a mountain-climbing theme. Help students reach their peak SAT scores with personalized study plans, practice tests, flashcards, and micro-lessons.

## Features

- **AI-Powered Generation**: Create practice tests, flashcards, study plans, and micro-lessons using OpenAI
- **Anonymous Sessions**: Users can try features without creating an account
- **User Accounts**: Full account system with email and password authentication
- **Data Migration**: Seamlessly migrate anonymous session data when users sign up
- **Stripe Integration**: Subscription-based premium features with Stripe payments
- **Progress Tracking**: Monitor performance across Math, Reading, and Writing sections
- **Spaced Repetition**: Smart flashcard review system
- **Responsive Design**: Polished UI with light/dark mode support
- **Mountain Theme**: Consistent climbing/summit metaphor throughout the app

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: Email and password authentication with bcrypt
- **Payments**: Stripe Checkout and Webhooks
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- OpenAI API key
- Stripe account (for payment features)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd study-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `OPENAI_API_KEY`: Get from https://platform.openai.com/api-keys
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_WEBHOOK_SECRET`: Get from https://dashboard.stripe.com
- `DATABASE_URL`: Leave as `file:./dev.db` for local SQLite

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Stripe Webhook Setup (Development)

For local testing of Stripe webhooks:

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe:
```bash
stripe login
```
3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
4. Copy the webhook signing secret to your `.env` as `STRIPE_WEBHOOK_SECRET`

### Deploying to Vercel (Turso)

For production you need a hosted database. Turso (libSQL) is supported.

1. **Turso**: Create a database at [turso.tech](https://turso.tech), then get:
   - Database URL (e.g. `libsql://your-db-username.turso.io`)
   - Auth token: `turso db tokens create <your-db-name>`

2. **Vercel env vars**: In your Vercel project → Settings → Environment Variables, set:
   - `DATABASE_URL` = your Turso database URL
   - `TURSO_AUTH_TOKEN` = the Turso auth token (required for Turso; not used for local `file:./dev.db`)
   - Plus your other keys (OpenAI, Stripe, `NEXT_PUBLIC_APP_URL`, etc.)

3. **Run migrations on Turso once** (so `User`, `Session`, etc. exist):
   ```bash
   set DATABASE_URL=libsql://your-db-username.turso.io
   set TURSO_AUTH_TOKEN=your-token
   npx prisma migrate deploy
   ```
   Use your real Turso URL and token. After this, your Vercel app can sign in and use the DB.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes
│   │   ├── ai/           # AI generation endpoints
│   │   ├── auth/         # Authentication endpoints
│   │   ├── stripe/       # Stripe integration
│   │   └── webhooks/     # Webhook handlers
│   ├── dashboard/         # Main dashboard page
│   ├── practice/          # Practice tests
│   ├── flashcards/        # Flashcard system
│   ├── lessons/           # Micro-lessons
│   ├── study-plan/        # Study plan generator
│   └── progress/          # Progress tracking
├── components/            # React components
│   ├── landing/          # Landing page components
│   └── ui/               # Reusable UI components
├── lib/                   # Core utilities
│   ├── auth.ts           # Authentication logic
│   ├── prisma.ts         # Prisma client singleton
│   ├── stripe.ts         # Stripe configuration
│   └── email.ts          # Email service
├── utils/                 # Helper utilities
│   ├── aiValidation.ts   # AI response validation
│   ├── premiumCheck.ts   # Free tier management
│   └── scoreTracking.ts  # Performance tracking
└── data/                  # Static data and topics
```

## Key Features

### AI Generation
- **Practice Tests**: Generate SAT-style questions for Math, Reading, and Writing
- **Flashcards**: Create topic-specific flashcard sets with spaced repetition
- **Study Plans**: Personalized study schedules based on goals and performance
- **Micro-Lessons**: Quick 1-2 minute lessons with practice questions

### User System
- **Password Authentication**: Secure email and password authentication with bcrypt
- **Anonymous Sessions**: Try features before signing up
- **Data Migration**: Automatically migrate anonymous data to user accounts

### Payment System
- **Stripe Checkout**: Secure subscription payments
- **Webhook Integration**: Real-time subscription status updates
- **Free Tier**: 1 free use across all features
- **Premium Access**: Unlimited access to all features

## Environment Variables

See [.env.example](.env.example) for all required and optional environment variables.

### Required:
- `DATABASE_URL`: Database connection string
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_PRICE_ID_MONTHLY`: Stripe price ID for monthly subscription
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `NEXT_PUBLIC_APP_URL`: Public URL of the application

### Optional:
- `EMAIL_API_KEY`: Email service API key (optional, for password reset emails if implemented)

## Deployment

### Production Build

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

### Database Migration

For production deployment:

1. Set `DATABASE_URL` to your production database
2. Run migrations:
```bash
npx prisma migrate deploy
```

### Environment Setup

Ensure all required environment variables are set in your production environment:
- Use proper production values for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Set `NEXT_PUBLIC_APP_URL` to your production domain
- Email service is optional (only needed if implementing password reset)

### Stripe Webhooks (Production)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Development

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Code Quality

```bash
# Run linter
npm run lint

# Build for production
npm run build
```

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.
