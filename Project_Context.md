# Project Context: Phone Repair Shop App

## 1. Background

The client runs a phone repair shop that provides **home repair services** — instead of customers bringing devices into a store, the shop owner travels to the customer's location to perform repairs. There are no additional technicians; the shop owner is the sole operator handling every request personally.

The goal is to build a mobile application that connects customers with the shop owner: customers submit repair requests describing their device issue, and the shop owner reviews, accepts or rejects, and manages those requests along with his business's revenue and history.

This project is being built by Rahul, who learns primarily through hands-on development. Development is happening in Google Antigravity ADE, with an AI coding agent assisting throughout.

---

## 2. Key Decisions & Rationale

### Single app, not two
Initially, a separate web dashboard was considered for the shop owner (better suited to desktop-style workloads like managing multiple requests and viewing stats). However, **the client explicitly prefers a single Android app** for both customers and the shop owner, with role-based views after login. This trade-off was made consciously — a mobile interface for the shop owner's dashboard is less ideal than a web dashboard would be, but it matches the client's stated preference for simplicity and a single point of access.

### Android first, iOS later
The client wants to launch on Android only initially, then expand to iOS using the same codebase. This is why React Native (not native Android/Kotlin) was chosen — it avoids re-architecting when iOS support is added later.

### Cost-conscious architecture
The client wants development and hosting costs kept as low as possible. Instead of a traditional Node.js/Express server (which requires paid hosting even when idle), the project uses **Supabase Edge Functions** (serverless) alongside Supabase's Postgres database, Auth, and Storage — all under one platform, most of it free at this project's expected scale. This keeps monthly costs close to $0 until the app has meaningful production traffic.

### Visual-first UI, minimal text
The client was clear that the app should minimize typing wherever possible. Instead of text dropdowns for device brand or problem type, the customer selects from **icon grids** (brand logos, problem-type icons). An "Other" option with a text field is the fallback for anything not covered by icons. This was a deliberate simplicity trade-off: faster for customers to use, at the cost of slightly more upfront design work (icon sets).

### Uber-inspired black & white design
The client specifically referenced Uber's app as a design reference — clean, minimal, black-and-white palette. This was chosen over glassmorphic or bold/colorful alternatives to keep the interface fast to scan and easy for a non-technical shop owner to use.

### Scope discipline
Several features were deliberately **deferred rather than skipped due to limitation** — the client chose to leave them out of the first version to keep the build simple and shippable:
- No in-app chat/messaging between customer and shop owner.
- No repair cost estimates shown to customers before acceptance.
- No scheduling/calendar system.
- No multi-technician support (single shop owner only).
- Revenue tracking is a single total amount per repair, not broken into labor/parts.

These may be revisited in a future version but should not be built now unless explicitly requested.

---

## 3. Tech Stack Summary

| Layer | Choice |
|---|---|
| Mobile Frontend | React Native (Expo), Android first |
| Backend | Supabase Edge Functions (serverless) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (repair photos) |
| Distribution | Google Play Store |
| Design Tooling | Google Stitch (for generating screen mockups from text prompts, see `design.md`) |
| Dev Environment | Google Antigravity ADE |

---

## 4. User Roles

- **Customer**: Submits repair requests (brand, device name, problem type, photos, optional notes), tracks status of one or more requests, receives acknowledgment when accepted.
- **Shop Owner**: Reviews incoming requests, accepts or rejects them, views repair history, and tracks total revenue over different time periods (this month, last month, all time).

---

## 5. Database Schema (Summary)

- `users` — id, email, password (via Supabase Auth), phone_number, role (`customer` | `shop_owner`), created_at
- `repair_requests` — id, customer_id, brand, device_name, problem_type, additional_notes, status (`pending` | `accepted` | `rejected` | `completed`), created_at, updated_at
- `repair_photos` — id, repair_request_id, photo_url, uploaded_at
- `completed_repairs` — id, repair_request_id, completion_date, amount_charged, notes

Full field-level detail lives in `AGENTS.md`.

---

## 6. Related Files in This Project

- **`AGENTS.md`** — technical context and instructions specifically for AI coding agents (tech stack, schema, feature list, non-goals, coding conventions).
- **`design.md`** — full set of Google Stitch design prompts for every screen (auth, customer side, shop owner side), written in the finalized black-and-white Uber-inspired style.
- **`Project_Context.md`** (this file) — the narrative background, decisions, and rationale behind the project, for anyone (human or AI) who needs to understand *why* the project is shaped the way it is, not just *what* to build.

---

## 7. Current Status

- Architecture, tech stack, database schema, feature set, and design language are all finalized.
- Design mockup prompts have been written for client review via Google Stitch.
- Development is about to begin in Google Antigravity ADE, starting with Android.
