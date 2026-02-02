# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for subscription management in Peak Prep.

## Prerequisites

- Stripe account (create one at https://stripe.com)
- Node.js project with Prisma already configured
- Environment variables file (`.env`)

---

## Step 1: Install Stripe Dependencies

Run this command in your terminal:

```bash
npm install stripe @stripe/stripe-js
```

This installs:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK (for checkout)

---

## Step 2: Get Your Stripe API Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to**: Developers → API keys
3. **Copy your keys**:
   - **Publishable key** (starts with `pk_test_` for test mode, `pk_live_` for production)
   - **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for production)

⚠️ **Important**: Start with **test mode** keys for development!

---

## Step 3: Set Up Environment Variables

Add these to your `.env` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...your_secret_key_here...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your_publishable_key_here...

# Stripe Webhook Secret (we'll get this in Step 6)
STRIPE_WEBHOOK_SECRET=whsec_...

# Your app URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 4: Create Stripe Products and Prices

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/products
2. **Click "Add product"**
3. **Create your subscription product**:
   - **Name**: "Peak Prep Premium" (or your product name)
   - **Description**: "Unlimited SAT practice tests, flashcards, and study plans"
   - **Pricing model**: Recurring
   - **Price**: Set your monthly/yearly price (e.g., $9.99/month)
   - **Billing period**: Monthly or Yearly
   - **Save the product**

4. **Copy the Price ID** (starts with `price_...`) - you'll need this in your code price_1Ro74sHipEwwXe8rQVcrrVm7

**Repeat for each pricing tier you want** (e.g., Monthly, Yearly, etc.)

---

## Step 5: Install Stripe CLI (For Local Webhook Testing)

### Windows Installation Options:

**Option 1: Using winget (Recommended - Easiest)**
```powershell
winget install stripe.stripe-cli
```

**Option 2: Using Scoop**
```powershell
# First install Scoop if you don't have it: https://scoop.sh
scoop install stripe
```

**Option 3: Using Chocolatey**
```powershell
# First install Chocolatey if you don't have it: https://chocolatey.org
choco install stripe-cli
```

**Option 4: Manual Download**
1. Go to: https://github.com/stripe/stripe-cli/releases/latest
2. Download `stripe_X.X.X_windows_x86_64.zip` (or the latest version)
3. Extract the ZIP file
4. Add the extracted folder to your PATH, or move `stripe.exe` to a folder already in your PATH (like `C:\Windows\System32`)

### After Installation:

1. **Verify installation** (close and reopen PowerShell first):
   ```powershell
   stripe --version
   ```

2. **Login to Stripe CLI**:
   ```powershell
   stripe login
   ```
   This will open your browser to authenticate.

3. **Forward webhooks to your local server** (run this in a separate terminal):
   ```powershell
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** (starts with `whsec_...`) from the terminal output and add it to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret_here...
   ```

⚠️ **Note**: If you get "command not found" after installation, close and reopen your PowerShell terminal, or restart your computer.

---

## Step 6: Set Up Production Webhooks (When Deploying)

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Enter your production URL**: `https://yourdomain.com/api/webhooks/stripe`
4. **Select events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the webhook signing secret** and add it to your production environment variables

---

## Step 7: Code Implementation Checklist

The following files need to be created/updated (I'll help you with these):

### Files to Create:
- [ ] `src/lib/stripe.ts` - Stripe client initialization
- [ ] `src/app/api/stripe/create-checkout/route.ts` - Create checkout session
- [ ] `src/app/api/stripe/create-portal/route.ts` - Customer portal (manage subscription)
- [ ] `src/app/api/webhooks/stripe/route.ts` - Handle webhook events
- [ ] `src/app/api/stripe/subscription-status/route.ts` - Get user's subscription status

### Files to Update:
- [ ] `src/lib/auth.ts` - Include subscription status in session
- [ ] `src/components/SettingsSidebar.tsx` - Add subscription management UI
- [ ] `src/app/dashboard/page.tsx` - Show subscription status
- [ ] `src/app/practice/page.tsx` - Check subscription for premium features
- [ ] `src/app/flashcards/page.tsx` - Check subscription for premium features

---

## Step 8: Test the Integration

1. **Start your dev server**: `npm run dev`
2. **Start Stripe CLI webhook forwarding** (separate terminal)
3. **Test checkout flow**:
   - Click "Subscribe" button
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. **Verify webhook events** in Stripe CLI terminal
5. **Check database** - user should have `stripeCustomerId` and `subscriptionStatus`

---

## Step 9: Go Live

When ready for production:

1. **Switch to live mode** in Stripe Dashboard
2. **Update environment variables** with live keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
3. **Set up production webhook** (Step 6)
4. **Test with real card** (use a small amount first!)
5. **Monitor** Stripe Dashboard for payments

---

## Pricing Strategy Recommendations

Consider these pricing tiers:

1. **Free Tier**:
   - Limited practice tests (e.g., 5 per month)
   - Limited flashcards (e.g., 3 sets)
   - Basic study plans

2. **Premium Monthly** ($9.99/month):
   - Unlimited practice tests
   - Unlimited flashcards
   - Advanced study plans
   - Progress tracking

3. **Premium Yearly** ($79.99/year - save ~33%):
   - Same as monthly
   - Better value for committed students

---

## Next Steps

Once you've completed Steps 1-6 (getting keys and setting up webhooks), let me know and I'll help you implement the code (Step 7).

The code implementation will include:
- Creating checkout sessions
- Handling webhook events
- Updating user subscription status
- Adding subscription management UI
- Protecting premium features

