# Project Context: Phone Repair Shop App (Mob Dr)

## 1. Background & Mission

The client operates an on-demand phone repair business called **Mob Dr** that provides **home repair services** (doorstep device repair). Instead of customers bringing their broken phones to a physical retail store, the shop owner travels directly to the customer's house, office, or designated location to perform the repair on-site.

Key operational realities:
- **Sole Operator**: There is no technician team or multi-tier dispatch system. The shop owner handles triage, scheduling, travel, physical repair, customer interaction, and revenue collection personally.
- **Hands-On Developer**: Built by Rahul in Google Antigravity ADE with pair programming from an AI coding assistant.
- **Target Audience**: Mobile users in India looking for fast, friction-free doorstep repairs without visiting crowded repair markets.

---

## 2. Key Decisions & Rationale

### Single Cross-Platform App (Two Roles in One Binary)
* **Decision**: A single React Native (Expo) application serving both Customers and the Shop Owner, dynamically mounting role-specific navigation stacks after authentication.
* **Rationale**: Initially, a desktop web dashboard was considered for the shop owner's management duties. However, the client explicitly preferred a single mobile app because the shop owner is constantly on the move traveling to repair sites. Having everything on his phone provides maximum portability. Building a single app also eliminates the overhead of maintaining separate web and mobile repositories.

### Android First, iOS Ready
* **Decision**: Launch on Android first, with iOS release scheduled for a later milestone using the exact same codebase.
* **Rationale**: Android represents the vast majority of the target demographic in the initial market. By utilizing React Native and Expo while avoiding platform-specific native dependencies, cross-platform portability to iOS is preserved without refactoring.

### Serverless, Cost-Optimized Backend (Supabase Free Tier)
* **Decision**: Rely entirely on Supabase (PostgreSQL, Supabase Auth, Supabase Storage, and Supabase Edge Functions) instead of spinning up dedicated server instances (Node.js/Express, Docker, AWS EC2).
* **Rationale**: The business prioritizes keeping monthly hosting overhead at $0 until production traffic justifies scaling. Supabase's generous free tier provides managed database hosting, authentication, storage, and serverless compute under a single umbrella.

### Visual-First UI with Minimal Typing
* **Decision**: Replace standard dropdowns and open-ended text fields with clean, icon-driven grid selectors (`IconGridSelector`). An "Other" option with a conditional text field serves as an intuitive fallback.
* **Rationale**: Customers reporting phone issues on a cracked or malfunctioning screen find typing tedious and prone to error. Tapping visually familiar brand logos and problem category icons streamlines request submission to under 60 seconds.

### 12 Indian Smartphone Brands Grid
* **Decision**: Expand brand selection to 12 popular smartphone brands in the Indian market: **Samsung, Apple, Xiaomi, Vivo, Oppo, Realme, OnePlus, Motorola, Nothing, Google, Poco, and Other**.
* **Rationale**: The Indian smartphone landscape features significant market share for brands like Realme, Vivo, Poco, and Nothing. Using vector outline representations maintains the sleek black-and-white aesthetic while maximizing recognition for local users.

### Uber-Inspired Minimalist Black & White Design
* **Decision**: Pure white background (`#FFFFFF`), solid black accents and primary buttons (`#000000`), gray secondary text (`#666666` and `#999999`), and no heavy borders. Subtle elevation shadows and rounded status pills give a modern, premium appearance.
* **Rationale**: The client explicitly referenced Uber's user experience. A high-contrast, uncluttered interface allows both customers and the busy shop owner to digest critical information instantly.

### Dedicated 'Pending' vs 'In Progress' Tabs for Shop Owner
* **Decision**: Organize the shop owner's incoming request screen into two distinct tabs:
  - **Pending**: New submissions awaiting triage (Accept / Reject).
  - **In Progress**: Accepted requests currently being fulfilled, preventing active jobs from disappearing from view.
* **Rationale**: In earlier iterations, accepting a request removed it from the incoming list, leaving the shop owner with no clear screen to locate accepted customer jobs, initiate calls, or complete repairs. The two-tab layout keeps active doorstep jobs immediately accessible.

### In-App Completion & Revenue Tracking (₹)
* **Decision**: When the shop owner finishes a repair, they trigger a "Complete Repair" modal directly from the request detail screen, entering the total amount charged in Indian Rupees (₹) and optional notes.
* **Rationale**: This action invokes the `complete-repair-request` Edge Function, moving the request to `completed` and creating an entry in the `completed_repairs` table. The `OwnerDashboardScreen` and `get-revenue-stats` Edge Function immediately incorporate this data into This Month, Last Month, and All Time revenue metrics and bar charts.

---

## 3. Explicit Non-Goals (Scope Discipline)

The following features were **intentionally excluded** from this phase to guarantee a rapid, stable launch:
1. **No In-App Chat / Messaging**: Communication is handled via phone calls using device dialers (`tel:...`).
2. **No Pre-Acceptance Price Estimates**: Device damage varies widely; prices are agreed upon after inspection or phone triage.
3. **No Calendar Scheduling**: The owner contacts the customer directly upon acceptance to coordinate the visit.
4. **No Multiple Staff Accounts**: The business is operated solely by the shop owner.
5. **No Parts vs. Labor Breakdown**: Only total revenue per repair is recorded to keep accounting frictionless.
6. **No Separate Web Admin Dashboard**: Everything is managed inside the Android app.

---

## 4. Current Milestone Status

- **Frontend**: Fully implemented in React Native / Expo (TypeScript). All screens for Auth, Customer, and Shop Owner are operational.
- **Backend & Database**: PostgreSQL schema, RLS policies, storage bucket policies, and database triggers deployed.
- **Edge Functions**: All 5 serverless functions implemented with role verification and graceful fallbacks.
- **Build Infrastructure**: Build scripts configured for Gradle 9.3.1 and Android Gradle Plugin 8.12.0 using clean Groovy DSL property assignment syntax.
