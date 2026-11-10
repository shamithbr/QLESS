# QLESS – College Canteen Pre-Ordering & Pickup System

> **"Skip the queue. Enjoy your break."**

QLESS is a modern, light-themed full-stack college canteen pre-ordering platform built for students, faculty, and campus restaurant owners. It eliminates crowded cafeteria queues by allowing patrons to pre-order food from 5 campus restaurants and choose an exact scheduled pickup time slot.

---

## 🚀 Key Features

1. **Unified Login Entry Point**:
   - Single clean login screen for all institutional members.
   - Automatically determines role (`student`, `faculty`, or `restaurant_owner`) from authenticated database record.
   - No public role selector; secure bcrypt-hashed credentials.

2. **Panel A: Student & Faculty Panel**:
   - Browse 5 campus restaurants with timing, photos, and live availability.
   - Rich menu item explorer with pure-veg filters, category tabs, and real-time search.
   - Single-restaurant cart validation (prevents mixed-vendor checkout).
   - **Exact Pickup Time Scheduling**: dynamically computes available slots with preparation lead times and order capacity limits.
   - **Dual Payment Options**:
     - **Demo Online Payment**: Interactive simulated UPI/Card gateway with failure testing mode.
     - **Pay at Counter**: Cash / UPI payment upon collecting food.
   - **Live Order Tracking**: Polling engine updates real-time status with visual 4-step progress bar.

3. **Panel B: Restaurant Owner Panel**:
   - Strict owner isolation: each owner accesses only their assigned outlet.
   - Real-time kitchen queue with incoming order audio/visual cues.
   - **Strict Order Lifecycle Workflow**:
     - `Awaiting Acceptance` &rarr; `Accepted` &rarr; `Preparing` &rarr; `Ready for Pickup` &rarr; `Completed`.
     - *Customer only sees "Preparing Your Order" when the kitchen explicitly clicks "Start Preparing".*
   - Live Menu Management: toggle item availability instantly, update prices in INR, and add new dishes.
   - Sales analytics and counter payment confirmation.

4. **Campus Outlets Included**:
   - **KK Restaurant** (40 menu items, South Indian breakfast, full meals, Chinese, canteen snacks) — *Uses user-provided reference photograph*
   - **Tasty Cafe** (20 menu items, Burgers, stone-baked pizzas, creamy pastas, cold coffee, shakes)
   - **Rolls Up** (20 menu items, Kathi rolls, wraps, paneer and chicken combos) — *Uses user-provided reference photograph*
   - **Bombay Kulfi** (10 menu items, Traditional malai kulfi, falooda, royal rabri)
   - **Juicy Fruits** (14 fresh citrus juices, tropical fruit coolers, and thick smoothies)

---

## 🔑 Local Development Credentials

| Role | User ID / Login | Default Password | Assigned Restaurant |
|---|---|---|---|
| **Student** | `QL1001` | `Qless@123` | N/A (Customer) |
| **Faculty** | `QL2001` | `Qless@123` | N/A (Customer) |
| **KK Owner** | `KKOWNER` | `Qless@123` | **KK Restaurant** |
| **Tasty Owner** | `TASTYOWNER` | `Qless@123` | **Tasty Cafe** |
| **Rolls Owner** | `ROLLSOWNER` | `Qless@123` | **Rolls Up** |
| **Kulfi Owner** | `KULFIOWNER` | `Qless@123` | **Bombay Kulfi** |
| **Juicy Owner** | `JUICYOWNER` | `Qless@123` | **Juicy Fruits** |

*Note: For production deployments, all users must reset default development passwords.*

---

## 🛠 Local Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Optional: MongoDB Atlas connection string
# If left empty, QLESS automatically uses the persistent embedded database engine
MONGODB_URI=""
JWT_SECRET="qless-college-canteen-secure-secret-2026"
```

### 3. Seed the Database
Populates all 7 local accounts, 5 restaurants, and 104 menu items:
```bash
npm run seed
```

### 4. Run Automated Verification Suite
Verifies all 25 acceptance tests:
```bash
npx tsx scripts/verify_system.ts
```

### 5. Start Full-Stack Development Server
Runs full-stack Express backend with Vite on port `3000`:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
