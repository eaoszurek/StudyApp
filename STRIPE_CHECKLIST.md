# Stripe Integration Checklist ✅

Use this checklist to verify you have everything needed for Stripe integration.

## ✅ Code Files (Already Complete)

- [x] `src/lib/stripe.ts` - Stripe client initialization
- [x] `src/app/api/stripe/create-checkout/route.ts` - Checkout session creation
- [x] `src/app/api/stripe/create-portal/route.ts` - Customer portal
- [x] `src/app/api/webhooks/stripe/route.ts` - Webhook handler
- [x] `src/app/api/stripe/subscription-status/route.ts` - Subscription status API
- [x] Updated `src/lib/auth.ts` - Subscription status in session
- [x] Updated `src/components/SettingsSidebar.tsx` - Subscription UI
- [x] Updated `src/app/dashboard/page.tsx` - Upgrade banner
- [x] Updated `src/app/practice/page.tsx` - Free tier limits
- [x] Updated `src/app/flashcards/page.tsx` - Free tier limits

## ✅ Dependencies (Already Installed)

- [x] `stripe` package installed
- [x] `@stripe/stripe-js` package installed

## ✅ Stripe CLI (Already Running)

- [x] Stripe CLI installed
- [x] Stripe CLI logged in
- [x] Webhook forwarding running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## ⚠️ Required Setup Steps

### 1. Environment Variables (.env file)

Create a `.env` file in your project root (if it doesn't exist) and add:

```env
# Stripe Keys (Get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...your_secret_key_here...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your_publishable_key_here...

# Stripe Webhook Secret (Get from Stripe CLI terminal output)
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret_here...

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Override price ID if different from default
STRIPE_PRICE_ID_MONTHLY=price_...your_price_id_here...
```

**How to get these:**

1. **Stripe API Keys:**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your **Secret key** (starts with `sk_test_`)
   - Copy your **Publishable key** (starts with `pk_test_`)

2. **Webhook Secret:**
   - Look at your Stripe CLI terminal window
   - You should see: `> Ready! Your webhook signing secret is whsec_...`
   - Copy that `whsec_...` value

3. **Price ID:**
   - Go to https://dashboard.stripe.com/products
   - Click on your product (or create one)
   - Copy the Price ID (starts with `price_`)
   - Update `src/lib/stripe.ts` line 18 if different from default

### 2. Stripe Product & Price Setup

- [ ] **Create a Product in Stripe Dashboard:**
  1. Go to https://dashboard.stripe.com/products
  2. Click "Add product"
  3. Name: "Peak Prep Premium" (or your product name)
  4. Description: "Unlimited SAT practice tests, flashcards, and study plans"
  5. Pricing model: **Recurring**
  6. Price: Set your monthly price (e.g., $9.99/month)
  7. Billing period: **Monthly**
  8. Save the product
  9. Copy the **Price ID** (starts with `price_`)

- [ ] **Update Price ID in code:**
  - Edit `src/lib/stripe.ts`
  - Replace `"price_1Ro74sHipEwwXe8rQVcrrVm7"` with your actual Price ID
  - Or set `STRIPE_PRICE_ID_MONTHLY` in your `.env` file

### 3. Database Schema

- [x] Database already has subscription fields:
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `subscriptionStatus`

## 🧪 Testing Checklist

Once everything is set up:

1. [ ] **Start your dev server:**
   ```bash
   npm run dev
   ```

2. [ ] **Verify Stripe CLI is running:**
   - Check terminal for: `> Ready! Your webhook signing secret is whsec_...`
   - Keep this terminal open while developing

3. [ ] **Test checkout flow:**
   - Go to your app (http://localhost:3000)
   - Click "Upgrade to Premium" button
   - Should redirect to Stripe checkout
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

4. [ ] **Verify webhook events:**
   - After completing checkout, check Stripe CLI terminal
   - You should see webhook events being received
   - Check your database - user should have `stripeCustomerId` and `subscriptionStatus: ACTIVE`

5. [ ] **Test subscription management:**
   - Go to Settings sidebar
   - Click "Manage Subscription"
   - Should open Stripe Customer Portal

6. [ ] **Test free tier limits:**
   - Sign out or use a different account
   - Try creating more than 5 practice tests
   - Try creating more than 3 flashcard sets
   - Should see upgrade prompts

## 🚨 Common Issues

**Issue: "STRIPE_SECRET_KEY is not set"**
- Solution: Make sure `.env` file exists and has `STRIPE_SECRET_KEY` set

**Issue: Webhooks not working**
- Solution: Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check that `STRIPE_WEBHOOK_SECRET` matches the one from Stripe CLI

**Issue: "Price ID is required"**
- Solution: Update `STRIPE_PRICE_ID_MONTHLY` in `src/lib/stripe.ts` or set it in `.env`

**Issue: Checkout redirects but shows error**
- Solution: Verify your Price ID exists in Stripe Dashboard and is active

## 📝 Quick Start Commands

```bash
# 1. Make sure Stripe CLI is running (in separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. Start your dev server
npm run dev

# 3. Open browser
# Go to http://localhost:3000
```

## ✅ You're Ready When:

- [x] All code files are created
- [ ] `.env` file has all required variables
- [ ] Stripe product and price created
- [ ] Price ID updated in code
- [ ] Stripe CLI running and forwarding webhooks
- [ ] Dev server running
- [ ] Test checkout works

---

**Need help?** Check the `STRIPE_SETUP_GUIDE.md` for detailed instructions.

