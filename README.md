# Mob Dr — Phone Repair Shop App

> **On-Demand Mobile Device Home Repair Service**  
> A cross-platform mobile application connecting customers directly with a repair shop owner for on-site device repairs. Built with **React Native (Expo)** and **Supabase**.

---

## 📱 Project Overview

**Mob Dr** simplifies doorstep phone repairs. Rather than customers visiting a physical repair shop, the shop owner travels directly to the customer to service the device.

- **Single Application, Two Roles**: Both customers and the shop owner use the same app binary. Upon authentication, the app checks the user's verified role (`customer` vs. `shop_owner`) from the PostgreSQL database and renders the corresponding interface.
- **Minimalist, Uber-Inspired Design**: Pure white background (`#FFFFFF`), black accents and actions (`#000000`), bold typography, underline input fields, and pill status badges.
- **Free-Tier Cost Optimization**: Architecture optimized to run within Supabase’s free tier without paid third-party dependencies (e.g., paid SMS providers).

---

## 🛠 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Mobile Frontend** | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) | Android-first, cross-platform ready for iOS |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end type safety |
| **Navigation** | [React Navigation v7](https://reactnavigation.org/) | Native Stack & Bottom Tabs |
| **Backend & Database** | [Supabase](https://supabase.com/) | Managed PostgreSQL with Row-Level Security (RLS) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) | Dual identifier support (Email or Phone Number + Password) |
| **Storage** | Supabase Storage | Customer-uploaded repair photos |

---

## 🚀 Key Features Implemented

### 1. Dual Authentication (Phone Number or Email)
- **Login Screen**: Uber-inspired minimal interface allowing login using either an email address or a 10-digit / international phone number. A secure database function (`get_email_for_phone`) resolves phone numbers to their account email seamlessly.
- **Signup Screen**: Streamlined account creation capturing **Full Name**, **Phone Number**, **Email**, **Password**, and **Role Selector** (segmented control between *Customer* and *Shop Owner*).
- **Session Confirmation Screen**: Confirms the active session and profile retrieved directly from the `public.users` table, including a one-tap sign-out feature for testing.

### 2. Database Schema & Security
- **`users` Table**: Public profile table mapped 1:1 with `auth.users`, storing `email`, `phone_number`, and `role`.
- **Database Triggers**:
  - `handle_new_user()`: Automatically synchronizes new signups to `public.users`.
  - `auto_confirm_user()`: Auto-confirms user signups for immediate frictionless login.
- **Row-Level Security (RLS)**: Enforces access controls with a recursion-free `get_my_role()` helper function.

---

## 📂 Project Structure

```text
Mob Dr/
├── assets/                    # App icons, splash screens, and image assets
├── skills/                    # Project-specific AI agent development skills
│   ├── new-screen-design/     # Uber-inspired black & white design rules
│   ├── icon-grid-selector/    # Icon grid guidelines for minimal typing
│   ├── photo-upload-flow/     # Customer photo capture & upload specs
│   ├── role-based-navigation/ # Customer vs. shop owner navigation logic
│   └── supabase-edge-function/# Serverless edge function patterns
├── src/
│   ├── components/            # Reusable UI components (buttons, badges)
│   │   └── auth/              # SocialAuthButton and auth elements
│   ├── config/                # Configuration (Supabase client initialization)
│   ├── constants/             # Design tokens and constants
│   ├── contexts/              # Global state (AuthContext & session listener)
│   ├── navigation/            # AppNavigator, AuthNavigator, role stacks
│   ├── screens/               # Screen implementations
│   │   ├── auth/              # Login, Register, SessionConfirmed screens
│   │   ├── customer/          # CustomerHome, NewRequest, RequestDetail
│   │   └── shop_owner/        # IncomingRequests, OwnerDashboard, Detail
│   └── types/                 # Shared TypeScript interfaces & navigation types
├── supabase/
│   └── migrations/            # Version-controlled SQL migrations
│       ├── 00001_initial_schema.sql
│       ├── 00002_storage_repair_photos.sql
│       └── 00003_auth_triggers.sql
├── .env.example               # Environment variables template
├── App.tsx                    # Root application component
├── app.config.ts              # Expo app configuration
└── package.json               # Project dependencies and npm scripts
```

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Expo Go](https://expo.dev/go) app installed on your Android device (or an Android emulator)
- A [Supabase](https://supabase.com/) project

### 1. Clone & Install
```bash
git clone <repository-url>
cd "Mob Dr"
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and configure your Supabase credentials:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase Project URL and Anon Public Key:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations
Execute the SQL migration scripts in your Supabase SQL Editor in numerical sequence:
1. `supabase/migrations/00001_initial_schema.sql`
2. `supabase/migrations/00002_storage_repair_photos.sql`
3. `supabase/migrations/00003_auth_triggers.sql`

### 4. Start Development Server
```bash
npm start
```
Scan the QR code with the Expo Go app on your phone (or press `a` to run on an connected Android emulator).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
