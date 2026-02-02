# Backend Migration Guide
## When and How to Add Your Backend

---

## ✅ **Current Status: Using localStorage**

Right now, the app uses **localStorage** for score tracking. This works fine for:
- Single-user testing
- MVP/demo purposes
- Development and prototyping

**What's stored in localStorage:**
- Practice session history
- Score calculations
- Progress tracking
- Section performance data

---

## 🚨 **When You NEED a Backend**

### **Immediate Need (Add Now):**
1. **Multi-device sync** - User wants to study on phone and computer
2. **User accounts** - Multiple users need separate data
3. **Data persistence** - Can't lose progress if localStorage is cleared
4. **Analytics** - Need to track user behavior across sessions
5. **Sharing features** - Study groups, leaderboards, etc.

### **Soon (Within 1-2 Months):**
1. **Large data storage** - localStorage has 5-10MB limit
2. **Offline-first** - Need sync when connection restored
3. **Backup/restore** - Users want to export their data
4. **Admin dashboard** - View all users' progress

### **Later (Scale Features):**
1. **Social features** - Study groups, competitions
2. **AI improvements** - Store user patterns for better recommendations
3. **Payment/subscriptions** - Premium features
4. **API integrations** - Connect with other study tools

---

## 🏗️ **Recommended Backend Architecture**

### **Option 1: Simple (Start Here)**
**Tech Stack:**
- **Database:** PostgreSQL or MongoDB
- **Backend:** Next.js API Routes (you're already using this!)
- **Auth:** NextAuth.js or Clerk
- **Hosting:** Vercel (same as frontend)

**Why:** Easiest migration, uses existing Next.js setup

### **Option 2: Full-Stack Framework**
**Tech Stack:**
- **Framework:** Supabase, Firebase, or AWS Amplify
- **Database:** Built-in (PostgreSQL for Supabase, Firestore for Firebase)
- **Auth:** Built-in
- **Hosting:** Platform-specific

**Why:** Faster setup, includes auth, real-time features

### **Option 3: Custom Backend**
**Tech Stack:**
- **Backend:** Node.js/Express, Python/Django, or Go
- **Database:** PostgreSQL
- **Auth:** JWT tokens
- **Hosting:** Railway, Render, or AWS

**Why:** Full control, best for complex features

---

## 📋 **Migration Steps**

### **Step 1: Choose Your Backend**
I recommend **Supabase** or **Next.js API Routes + PostgreSQL** because:
- Easy to set up
- Works great with Next.js
- Free tier available
- Good documentation

### **Step 2: Set Up Database Schema**

```sql
-- Users table (if using custom auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Practice sessions table
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  section VARCHAR(20) NOT NULL, -- 'math', 'reading', 'writing'
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  raw_score INTEGER,
  scaled_score INTEGER,
  estimated_total INTEGER,
  difficulty VARCHAR(20),
  time_spent INTEGER, -- in minutes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Score history (aggregated)
CREATE TABLE score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  best_score INTEGER,
  average_score INTEGER,
  total_sessions INTEGER,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### **Step 3: Create API Endpoints**

Replace `src/utils/scoreTracking.ts` functions with API calls:

```typescript
// src/utils/scoreTracking.ts (updated)
export async function savePracticeSession(session: PracticeSession): Promise<void> {
  const res = await fetch('/api/scores/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error('Failed to save session');
}

export async function getScoreHistory(): Promise<ScoreHistory> {
  const res = await fetch('/api/scores/history');
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}
```

### **Step 4: Create API Routes**

```typescript
// src/app/api/scores/save/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your database client

export async function POST(req: Request) {
  try {
    const session = await req.json();
    // Save to database
    const result = await db.practiceSessions.create({
      data: {
        userId: session.userId,
        section: session.section,
        correct: session.correct,
        total: session.total,
        // ... other fields
      },
    });
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
```

### **Step 5: Add Authentication**

```typescript
// src/app/api/scores/history/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's scores from database
  const scores = await db.practiceSessions.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({ sessions: scores });
}
```

### **Step 6: Migrate Existing Data (Optional)**

If users already have localStorage data:

```typescript
// Migration script
export async function migrateLocalStorageToBackend() {
  const localData = localStorage.getItem('sat_score_history');
  if (!localData) return;
  
  const history = JSON.parse(localData);
  for (const session of history.sessions) {
    await savePracticeSession(session);
  }
  
  // Clear localStorage after migration
  localStorage.removeItem('sat_score_history');
}
```

---

## 🔄 **Migration Strategy**

### **Phase 1: Dual Write (Recommended)**
1. Keep localStorage working
2. Also save to backend when available
3. Read from backend first, fallback to localStorage
4. Gradually migrate users

### **Phase 2: Backend Primary**
1. Make backend the source of truth
2. localStorage becomes cache only
3. Sync on app load

### **Phase 3: Remove localStorage**
1. All data in backend
2. Remove localStorage code
3. Add offline support if needed

---

## 🛠️ **Quick Start: Supabase (Easiest)**

### **1. Create Supabase Project**
```bash
# Install Supabase client
npm install @supabase/supabase-js
```

### **2. Set Up Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **3. Create Database Tables**
Use Supabase SQL editor to run the schema from Step 2.

### **4. Update scoreTracking.ts**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function savePracticeSession(session: PracticeSession) {
  const { error } = await supabase
    .from('practice_sessions')
    .insert([session]);
  
  if (error) throw error;
}
```

---

## 📊 **What to Keep in localStorage (Even with Backend)**

- User preferences (theme, settings)
- Temporary form data
- Cache for offline use
- UI state

---

## ⚠️ **Important Notes**

1. **Don't rush** - localStorage works fine for MVP
2. **Add auth first** - Before storing user data
3. **Test migration** - Have a way to migrate existing data
4. **Backup strategy** - Always backup before migration
5. **Error handling** - Handle offline/network errors gracefully

---

## 🎯 **Recommended Timeline**

- **Week 1-2:** Set up backend (Supabase or Next.js API)
- **Week 3:** Add authentication
- **Week 4:** Migrate score tracking to backend
- **Week 5:** Test and fix issues
- **Week 6:** Remove localStorage dependency

---

## 💡 **Pro Tips**

1. **Start with Supabase** - Easiest to set up and migrate
2. **Use TypeScript** - Type safety for database queries
3. **Add error boundaries** - Handle backend failures gracefully
4. **Keep localStorage as fallback** - Better UX if backend is down
5. **Add loading states** - Show spinners during API calls
6. **Cache responses** - Reduce API calls with React Query or SWR

---

## 🆘 **Need Help?**

When you're ready to add the backend, I can help you:
1. Set up the database schema
2. Create API endpoints
3. Add authentication
4. Migrate existing data
5. Handle edge cases

Just let me know when you want to start! 🚀

