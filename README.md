# Mob Dr — Phone Repair Shop App

> **On-Demand Mobile Device Home Repair Service**  
> A cross-platform mobile application connecting customers directly with a repair shop owner for on-site device repairs. Built with **React Native (Expo)**, **TypeScript**, and **Supabase**.

---

## 📱 Project Overview

**Mob Dr** simplifies doorstep phone repairs. Rather than customers visiting a physical repair shop, the shop owner travels directly to the customer to service their mobile device on-site.

- **Single Application, Two Roles**: Both customers and the shop owner use the exact same mobile application binary. Upon login, the app checks the user's role (`customer` vs. `shop_owner`) from PostgreSQL and mounts the appropriate navigation stack.
- **Minimalist, Uber-Inspired Design**: Pure white background (`#FFFFFF`), solid black interactive elements (`#000000`), subtle elevation/shadows without heavy borders, clean typography, underline inputs, and pill status badges.
- **Visual-First UI**: Customers select their device brand and problem type from clean icon grids rather than typing into dropdowns, with "Other" revealing a custom text input only when needed.
- **India Brand Grid**: Includes official vector outline logomarks for 12 popular smartphone brands in India: Samsung, Apple, Xiaomi, Vivo, Oppo, Realme, OnePlus, Motorola, Nothing, Google, Poco, and Other.
- **Cost-Conscious Architecture**: Fully serverless backend powered by Supabase (PostgreSQL, Auth, Storage, Edge Functions) engineered to remain within the free tier.

---

## 🛠 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Mobile Frontend** | [React Native](https://reactnative.dev/) `0.86.3` with [Expo](https://expo.dev/) `~57.0.18` | Android-first, cross-platform ready for iOS |
| **Language** | [TypeScript](https://www.typescriptlang.org/) `~6.0.3` / React `19.2.3` | Strict end-to-end type safety |
| **Navigation** | [React Navigation v7](https://reactnavigation.org/) | Type-safe Native Stack & Bottom Tabs |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL) | Managed PostgreSQL with Row-Level Security (RLS) |
| **Serverless Functions**| Supabase Edge Functions (Deno / TypeScript) | Role-verified business logic and stat aggregation |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) | Dual identifier support (Email or Phone Number + Password) |
| **Media Storage** | Supabase Storage (`repair-photos` bucket) | Customer-uploaded photos served via secure 1-hour signed URLs |
| **Build Tooling** | Gradle `9.3.1` / AGP `8.12.0` / Hermes Engine | Configured with modern Groovy DSL syntax |

---

## 🚀 Core Features

### 👤 Customer Experience
1. **Dual-Identifier Authentication**:
   - Log in using either an email address or a 10-digit / international phone number.
   - Simplified signup defaulting to Customer role (Shop Owner accounts are pre-seeded).
2. **Submit Repair Request**:
   - **Brand Selector**: 12-brand icon grid with vector logomarks.
   - **Problem Selector**: Icon-driven selection for Cracked Screen, Battery Issue, Water Damage, Speaker Problem, Charging Port, and Other.
   - **Photo Attachment**: Upload 1–2 photos of the damaged device using Expo ImagePicker with client-side compression and Supabase Storage upload.
   - **Additional Notes**: Optional free-text field for extra context.
3. **Customer Dashboard & Status Tracking**:
   - Overview of all submitted repair requests with live status badges (`pending`, `accepted`, `rejected`, `completed`).
   - Request Detail screen with visual 4-step status timeline:
     `Submitted` ➔ `Acknowledged` ➔ `In Progress` ➔ `Completed`.

### 🧰 Shop Owner Experience
1. **Incoming Requests (Tabbed Management)**:
   - **Pending Tab**: List of incoming doorstep repair requests displaying photo thumbnails (via signed URLs), device brand, model, problem type, and submission time.
   - **In Progress Tab**: Retains accepted requests so the owner can track active jobs in the field.
2. **Shop Owner Request Detail**:
   - Full photo gallery with 1-hour signed Supabase Storage URLs.
   - Complete device info and problem description.
   - Customer contact card with a one-tap phone dialer action (`tel:...`).
   - Actions for **Accept** and **Reject** calling serverless Edge Functions.
   - **Complete Repair Action**: Interactive modal allowing the shop owner to record the total amount charged (in ₹) and optional completion notes upon finishing the job.
3. **Revenue Dashboard & Analytics**:
   - Total revenue metrics with period switcher: **This Month**, **Last Month**, and **All Time**.
   - Custom pure-React-Native revenue bar chart visualizing earnings over time.
   - Detailed list of completed repairs displaying device name, completion date, and amount charged.

---

## ⚡ Supabase Edge Functions

All Edge Functions enforce server-side role validation using the caller's JWT token:

| Function | Access Role | Description |
|---|---|---|
| `create-repair-request` | `customer` | Validates payload, inserts repair request row, and associates uploaded photos. |
| `accept-repair-request` | `shop_owner` | Updates request status from `pending` to `accepted`. |
| `reject-repair-request` | `shop_owner` | Updates request status from `pending` to `rejected`. |
| `complete-repair-request` | `shop_owner` | Updates request to `completed` and inserts into `completed_repairs` with `amount_charged`. |
| `get-revenue-stats` | `shop_owner` | Aggregates revenue for This Month, Last Month, and All Time, plus historical chart bars. |

---

## 📂 Project Structure

```text
Mob Dr/
├── .agent/
│   └── rules/                 # AI & developer operational rules
│       ├── android-rules.md   # Android SDK, Gradle 9+, and build standards
│       └── coding-rules.md    # TypeScript, React Native & Supabase conventions
├── android/                   # Native Android project configuration
│   ├── app/build.gradle       # App-level Gradle build script (Gradle 9 compliant)
│   ├── build.gradle           # Root Gradle build script
│   └── gradle.properties      # JVM args, architecture flags, and warning mode
├── assets/                    # App icons, splash screens, and brand graphics
├── skills/                    # Project-specific AI agent workflows
│   ├── new-screen-design/     # Uber-inspired black & white design rules
│   ├── icon-grid-selector/    # Icon grid guidelines for minimal typing
│   ├── photo-upload-flow/     # Customer photo capture & upload specs
│   ├── role-based-navigation/ # Customer vs. shop owner navigation logic
│   └── supabase-edge-function/# Serverless edge function patterns
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── BrandLogos.tsx     # 12 Indian smartphone brand vector logomarks
│   │   ├── IconGridSelector.tsx# Grid component for brands and problem types
│   │   └── auth/              # Social and form button components
│   ├── config/                # Supabase client setup with AsyncStorage
│   ├── constants/             # Design tokens (colors, spacing, typography)
│   ├── contexts/              # Global state (AuthContext with role-based routing)
│   ├── navigation/            # AppNavigator, AuthNavigator, CustomerStack, ShopOwnerStack
│   ├── screens/               # Screen implementations
│   │   ├── auth/              # LoginScreen, RegisterScreen
│   │   ├── customer/          # CustomerHomeScreen, NewRequestScreen, RequestDetailScreen
│   │   └── shop_owner/        # IncomingRequestsScreen, OwnerRequestDetailScreen, OwnerDashboardScreen
│   ├── types/                 # Shared TypeScript interfaces & navigation types
│   └── utils/                 # Storage utilities (signed URLs, photo uploads)
├── supabase/
│   ├── functions/             # Serverless TypeScript Edge Functions (Deno)
│   └── migrations/            # Version-controlled PostgreSQL migrations
├── AGENTS.md                  # Project context & guidelines for AI coding agents
├── ARCHITECTURE.md            # Deep-dive architecture and data flow documentation
├── DEBUG.md                   # Troubleshooting guide for Gradle, Metro, and Supabase
├── design.md                  # Screen-by-screen Google Stitch design specifications
├── package.json               # Dependencies and scripts
├── PROJECT_CONTEXT.md         # Narrative project history and design decisions
└── TESTING.md                 # End-to-end testing scenarios and verification steps
```

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Android Studio](https://developer.android.com/studio) with Android SDK 36 and NDK 27+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Supabase](https://supabase.com/) project (Free tier)

### 1. Installation
```bash
git clone <repository-url>
cd "Mob Dr"
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory (based on `.env.example`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply Supabase Database Migrations
Run the SQL files in `supabase/migrations/` sequentially in your Supabase SQL Editor:
1. `00001_initial_schema.sql` (Creates tables, enum types, RLS policies)
2. `00002_storage_repair_photos.sql` (Configures `repair-photos` bucket and access rules)
3. `00003_auth_triggers.sql` (Sets up auto-confirm and `users` sync triggers)

### 4. Seed the Shop Owner Account
Since public signups default to `customer`, the shop owner account must be pre-seeded:
```sql
-- Replace with the UUID from auth.users after signing up the owner account
UPDATE public.users SET role = 'shop_owner' WHERE email = 'owner@mobdr.com';
```

### 5. Running the App
```bash
# Start Metro bundler
npx expo start

# Run directly on an Android emulator or connected device
npx expo run:android
```

---

## 🛡️ License
Private and confidential. Developed for Mob Dr.
