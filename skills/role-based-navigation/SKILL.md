---
name: role-based-navigation
description: Use this skill when adding a new screen to the app or wiring up navigation, to correctly gate the screen behind the customer or shop_owner role. Since both roles share a single app binary, this ensures no screen or action is ever reachable by the wrong role.
---

# Role-Based Navigation & Screen Gating

## When to use this
Any time a new screen is added, or when setting up the initial navigation structure. This app has exactly two roles — `customer` and `shop_owner` — sharing one Android app. There is no separate shop-owner app or web dashboard; access is controlled entirely by role after login.

## Navigation structure

- After login, read `role` from the `users` table (or from the session/auth metadata if cached there) and route into one of two top-level navigation stacks:
  - `CustomerStack` — Home/Dashboard, Submit New Request, Request Detail (customer view).
  - `ShopOwnerStack` — Incoming Requests, Request Detail (shop owner view), Dashboard/Stats.
- These stacks should be **mutually exclusive** — a customer should never be able to navigate into `ShopOwnerStack` screens and vice versa, even via deep link.
- Store the resolved role in app state (e.g. context or a state store) immediately after login so screens and API calls can reference it without re-fetching repeatedly.

## Screen-level gating

- Every screen component should be able to assume it's only ever reached by the correct role — enforce this at the navigation layer (don't scatter role checks inside individual screen bodies).
- If a role-mismatched navigation attempt somehow occurs (e.g. stale deep link), redirect to that user's correct home screen rather than showing an error screen.

## Backend gating (defense in depth)

- Navigation-layer gating is a UX convenience, **not** a security boundary — every Edge Function that performs a role-specific action (e.g. accept/reject a request, view revenue) must independently verify the caller's role server-side. See the `supabase-edge-function` skill for the standard role-check pattern.
- Never rely solely on hiding a button or screen client-side to prevent an action — always enforce it in the backend function too.

## Example prompt to the agent
"Set up the initial navigation structure using our role-based-navigation skill, with CustomerStack and ShopOwnerStack as described."
