# Project Context: Phone Repair Shop App

This file gives an AI coding agent full context on the project so it can generate consistent, aligned code. Read this before writing or modifying any code.

---

## 1. Project Overview

A mobile application for a phone repair shop that offers **home repair services**. The shop owner visits customers directly rather than customers bringing devices to a physical location. The app connects customers who need device repairs with the shop owner who manages and fulfills those requests.

**Single application, two roles**: One React Native Android app (iOS later) with role-based views — customers and the shop owner use the same app, but see different screens based on their role after login.

---

## 2. Tech Stack

- **Frontend**: React Native (Expo), Android-first, iOS to follow using the same codebase.
- **Backend**: Supabase Edge Functions (serverless, no dedicated server to manage).
- **Database**: PostgreSQL, hosted on Supabase.
- **Auth**: Supabase Auth.
- **File Storage**: Supabase Storage (for customer-uploaded repair photos).
- **Deployment**: Google Play Store (Android).
- **Language**: JavaScript/TypeScript across the entire stack for consistency.
- **Cost priority**: Built to stay within Supabase's free tier as long as possible. Avoid introducing paid third-party services unless explicitly approved.

---

## 3. User Roles

1. **Customer** — submits repair requests, tracks status, receives acknowledgment when the shop owner accepts.
2. **Shop Owner** — the sole operator of the business. Reviews incoming requests, accepts/rejects them, tracks completed repairs and revenue. There is no technician team; the shop owner personally performs home repairs.

---

## 4. Database Schema

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| email | text | |
| password | text | hashed (handled via Supabase Auth) |
| phone_number | text | |
| role | enum | `customer` \| `shop_owner` |
| created_at | timestamp | |

### `repair_requests`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| customer_id | uuid | FK → users.id |
| brand | text | e.g. Apple, Samsung, OnePlus, Xiaomi, Other (+ custom text if Other) |
| device_name | text | e.g. "iPhone 13", "Galaxy S22" |
| problem_type | text | e.g. cracked screen, battery issue, water damage, speaker problem, charging port, Other (+ custom text if Other) |
| additional_notes | text | optional, free text |
| status | enum | `pending` \| `accepted` \| `rejected` \| `completed` |
| created_at | timestamp | |
| updated_at | timestamp | |

### `repair_photos`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| repair_request_id | uuid | FK → repair_requests.id |
| photo_url | text | Supabase Storage URL |
| uploaded_at | timestamp | |

### `completed_repairs`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| repair_request_id | uuid | FK → repair_requests.id |
| completion_date | timestamp | same date used for both completion and service date |
| amount_charged | numeric | total amount only (no separate labor/parts breakdown for now) |
| notes | text | optional |

---

## 5. Core Features

### Customer Side
- **Home/Dashboard**: List of all their repair requests with status badges.
- **Submit New Request**: Icon-driven flow — select brand (icon grid, "Other" reveals text input), select problem type (icon grid, "Other" reveals text input), upload 1–2 photos, optional "Additional Notes" text field, submit.
- **Request Detail**: View submitted request (brand icon, problem icon, photos, notes) and a status timeline: Submitted → Acknowledged → In Progress → Completed.
- No cost estimates, no messaging/chat, and no scheduling shown to the customer at this stage — intentionally deferred/out of scope for now.

### Shop Owner Side
- **Incoming Requests**: List of pending requests with thumbnail, brand/device, problem type, submission time.
- **Request Detail**: Full request view with photos, device info, notes, customer contact info, Accept/Reject buttons.
- **Dashboard/Stats**: Total revenue (This Month / Last Month / All Time), simple revenue chart, list of completed repairs with amount charged and completion date.

---

## 6. Design Language

- **Aesthetic**: Clean, minimal, Uber-inspired.
- **Color palette**: White (primary background) and Black (primary accent/actions) only. No secondary colors at this stage.
- **Typography**: Bold black headings, gray subtext for secondary info, minimal use of text overall.
- **Visual-first philosophy**: The client explicitly wants minimal typing. Brand selection and problem-type selection are done via icon grids, not dropdowns or text fields. "Other" options reveal a text input only when needed.
- **Components**: Subtle shadows instead of heavy borders, generous whitespace, rounded photo thumbnails, black pill / white pill status badges.
- Full screen-by-screen design prompts are in `design.md` (companion file) if present in this repo.

---

## 7. Explicit Non-Goals (for now)

Do not build these unless the user explicitly asks — they were deliberately deferred during planning:
- Real-time chat/messaging between customer and shop owner.
- Cost estimates or repair quotes shown to the customer before acceptance.
- Scheduling/calendar features.
- Multiple technicians or staff accounts (single shop owner only).
- A separate web dashboard (everything lives in the one Android app).
- Detailed revenue breakdown (labor vs. parts) — only total amount charged is tracked.

---

## 8. Development Notes for the Agent

- Keep the codebase in JavaScript/TypeScript throughout (React Native + Supabase Edge Functions).
- Favor Supabase's built-in features (Auth, Storage, Edge Functions, Realtime if needed later) over introducing new third-party services, to keep costs near zero.
- Role-based routing: after login, check `users.role` and direct to the Customer or Shop Owner navigation stack accordingly. Both live in the same app binary.
- The user (developer, "Rahul") is a hands-on learner — when generating code, prefer clear, well-commented, incremental changes over large opaque scaffolding, and explain non-obvious architectural choices in comments or accompanying notes.
- iOS is a planned future target using the same React Native codebase — avoid Android-only native modules where a cross-platform alternative exists.
