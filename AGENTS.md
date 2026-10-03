# Project Context & Agent Instructions: Phone Repair Shop App (Mob Dr)

This file provides any AI coding agent with the complete, authoritative technical context for the **Mob Dr** mobile application codebase. Review this document before writing, modifying, or refactoring code.

---

## 1. Project Overview

**Mob Dr** is an on-demand mobile device home repair service application. Rather than requiring customers to bring damaged devices to a retail repair shop, the shop owner travels directly to the customer's home or office to perform on-site repairs.

### Operational Model
- **Sole Operator**: The shop owner is the only operator. He personally handles request triage, phone coordination, travel, technical repairs, and payment collection.
- **Single Cross-Platform Binary**: One React Native (Expo) application serving both roles (**Customer** and **Shop Owner**). Role-based navigation switches dynamically after authentication based on the verified role in `public.users`.
- **Target OS**: Android-first (distribution via Google Play Store), with iOS compatibility strictly maintained for future release.

---

## 2. Tech Stack

- **Frontend Framework**: React Native `0.86.3` with Expo SDK `~57.0.18` (React `19.2.3`).
- **Language**: TypeScript `~6.0.3` across the entire stack (screens, components, utilities, and Edge Functions).
- **Navigation**: React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`).
- **Backend & Database**: PostgreSQL hosted on Supabase with Row-Level Security (RLS).
- **Serverless Compute**: Supabase Edge Functions (Deno / TypeScript).
- **Authentication**: Supabase Auth with dual login support (Email or Phone Number + Password).
- **File Storage**: Supabase Storage (`repair-photos` bucket) serving images via time-limited signed URLs (1-hour TTL).
- **Icons & Graphics**: `@expo/vector-icons` (Ionicons) and custom vector outlines via `react-native-svg`.
- **Build System**: Android Gradle Plugin `8.12.0`, Gradle `9.3.1`, Hermes JavaScript Engine.
- **Cost Discipline**: Strict zero-cost architecture designed to run within Supabase's free tier. No external paid APIs or messaging providers without explicit authorization.

---

## 3. User Roles & Authentication Flow

1. **Customer**:
   - Creates an account via `RegisterScreen`. All new public signups automatically default to the `customer` role via database trigger.
   - Can submit new doorstep repair requests, attach photos, and monitor progress.
2. **Shop Owner**:
   - The sole business operator.
   - Account is **pre-seeded** in the database (`UPDATE public.users SET role = 'shop_owner' WHERE email = ...`). Public signup cannot select the shop owner role.
   - Triages pending requests, coordinates with customers, updates job status, records repair fees (₹), and reviews revenue analytics.

### Authentication Mechanics
- Users log in with an **Email** OR a **Phone Number** (10-digit Indian standard or international format) + Password.
- When a phone number is entered, the app calls the PostgreSQL RPC function `get_email_for_phone(phone_input)` to resolve the associated auth email, then completes authentication via `supabase.auth.signInWithPassword`.
- `AuthContext` listens to auth state changes, retrieves the authenticated user's profile from `public.users`, and exposes `user`, `role`, and session helpers.

---

## 4. Database Schema & Security

### `users`
| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | Primary Key, FK → `auth.users.id` (ON DELETE CASCADE) |
| `email` | text | Unique, lowercased |
| `phone_number` | text | Normalized phone number |
| `role` | user_role enum | `'customer'` \| `'shop_owner'`, defaults to `'customer'` |
| `created_at` | timestamptz | Defaults to `now()` |

### `repair_requests`
| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `customer_id` | uuid | FK → `users.id` (ON DELETE CASCADE) |
| `brand` | text | Selected brand or custom text if 'Other' |
| `device_name` | text | Model name (e.g., "iPhone 14 Pro", "Galaxy S23") |
| `problem_type` | text | Issue category or custom text if 'Other' |
| `additional_notes` | text | Optional free-text details |
| `status` | repair_status enum | `'pending'` \| `'accepted'` \| `'rejected'` \| `'completed'` |
| `created_at` | timestamptz | Defaults to `now()` |
| `updated_at` | timestamptz | Defaults to `now()` |

### `repair_photos`
| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `repair_request_id` | uuid | FK → `repair_requests.id` (ON DELETE CASCADE) |
| `photo_url` | text | Relative path within `repair-photos` bucket (`{userId}/{fileName}`) |
| `uploaded_at` | timestamptz | Defaults to `now()` |

### `completed_repairs`
| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `repair_request_id` | uuid | Unique FK → `repair_requests.id` (ON DELETE CASCADE) |
| `completion_date` | timestamptz | Defaults to `now()` |
| `amount_charged` | numeric | Total amount charged in INR (₹) |
| `notes` | text | Optional completion notes |

### Database Functions & Triggers
- `get_my_role()`: Fast, recursion-safe security helper reading `public.users.role`.
- `get_email_for_phone(phone_input text)`: Security definer function mapping phone numbers to login emails.
- `handle_new_user()`: Trigger on `auth.users` inserting new rows into `public.users` with default `'customer'` role.
- `auto_confirm_user()`: Trigger on `auth.users` auto-confirming email to enable immediate login.

---

## 5. Screen Inventory & Navigation Architecture

```
Root: AppNavigator
├── Auth Stack (Unauthenticated)
│   ├── LoginScreen
│   └── RegisterScreen (defaults to Customer role)
├── Customer Stack (role === 'customer')
│   ├── CustomerNavigator (Bottom Tabs)
│   │   ├── CustomerHomeScreen (Active requests list & status badges)
│   │   └── NewRequestScreen (12 Brand grid, problem grid, photo upload)
│   └── RequestDetailScreen (4-step visual timeline, photos, device summary)
└── Shop Owner Stack (role === 'shop_owner')
    ├── ShopOwnerNavigator (Bottom Tabs)
    │   ├── IncomingRequestsScreen (Tabs: 'Pending' vs 'In Progress')
    │   └── OwnerDashboardScreen (Revenue stats, timeline chart, completed repairs)
    └── OwnerRequestDetailScreen (Photo carousel, call customer, accept/reject, complete repair modal)
```

### Brand Grid Specifications
- Vector logomarks located in `src/components/BrandLogos.tsx`.
- 12 brands for the Indian market: **Samsung, Apple, Xiaomi, Vivo, Oppo, Realme, OnePlus, Motorola, Nothing, Google, Poco, Other**.
- Pure black/white vector outlines maintaining visual consistency across high-DPI screens.

---

## 6. Serverless Edge Functions

All functions reside in `supabase/functions/` and validate caller JWT credentials:

1. **`create-repair-request`**:
   - Role: `customer`
   - Accepts device details, brand, problem, notes, and photo storage paths.
2. **`accept-repair-request`**:
   - Role: `shop_owner`
   - Updates status from `pending` to `accepted`.
3. **`reject-repair-request`**:
   - Role: `shop_owner`
   - Updates status from `pending` to `rejected`.
4. **`complete-repair-request`**:
   - Role: `shop_owner`
   - Moves request to `completed`, inserts row into `completed_repairs` with `amount_charged`.
5. **`get-revenue-stats`**:
   - Role: `shop_owner`
   - Aggregates revenue for `this_month`, `last_month`, `all_time`, and returns historical chart buckets.

---

## 7. Storage & Signed URL Guidelines

- Bucket: `repair-photos` (private bucket).
- Files uploaded as `{customerId}/{timestamp}_{random}.jpg`.
- **Never serve raw public URLs**: Always generate time-limited signed URLs via `getSignedPhotoUrl` / `getSignedPhotoUrls` (`src/utils/storage.ts`) with a default 1-hour expiration (3600 seconds).

---

## 8. Android Build & Gradle Rules

- Gradle version: `9.3.1`.
- **Groovy DSL Property Assignment Requirement**: All property assignments in `build.gradle` must strictly use `=` syntax (`namespace = "..."`, `compileSdk = 36`, `versionCode = 1`, `url = '...'`). Calling property setters as commands without `=` will trigger deprecation warnings or fail in Gradle 10.
- Warning suppression configured via `org.gradle.warning.mode=summary` in `android/gradle.properties`.
- Architecture support: `armeabi-v7a,arm64-v8a,x86,x86_64`.
- React Native Hermes Engine enabled by default.

---

## 9. Explicit Non-Goals (Scope Discipline)

Do **NOT** implement the following without explicit instructions:
- Real-time in-app chat or messaging.
- Upfront repair pricing or cost estimates shown to customers.
- Calendar or automated dispatch scheduling.
- Multiple technician accounts or dispatch queues.
- Dedicated web portal (mobile app handles both roles).
- Detailed labor vs. parts cost breakdowns.

---

## 10. Agent Development Guidelines

- **TypeScript Safety**: Maintain strict types across navigation, screen props, and database entities (`src/types/index.ts`).
- **Resilient Fallbacks**: If an Edge Function is unreachable or experiencing cold start delays, screens implement resilient database fallbacks while respecting RLS.
- **Minimalist Styling**: Adhere to the Uber-inspired black-and-white theme (`#FFFFFF` background, `#000000` accents, `#666666` secondary text, subtle shadows, pill badges).
- **Educational Comments**: Provide clear comments explaining architectural decisions to support hands-on learning.
