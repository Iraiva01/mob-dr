---
name: supabase-edge-function
description: Use this skill when creating a new backend endpoint (Edge Function) for the Phone Repair Shop App — e.g. "create an endpoint to accept a repair request", "add a function to calculate revenue". Defines the project's standard structure, auth handling, and error format for all Supabase Edge Functions so every endpoint is consistent.
---

# Creating a Supabase Edge Function

## When to use this
Any time a new server-side action is needed — creating a repair request, accepting/rejecting a request, calculating revenue stats, uploading a photo record, etc. This project uses **Supabase Edge Functions exclusively** — do not introduce a separate Express/Node server.

## Folder convention
Each function lives in its own folder under `supabase/functions/`:
```
supabase/functions/
  create-repair-request/
    index.ts
  accept-repair-request/
    index.ts
  get-revenue-stats/
    index.ts
```
Name folders as `verb-noun`, kebab-case, matching the action (e.g. `create-repair-request`, not `repairRequestCreate` or `requests`).

## Standard structure for every function

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1. CORS / method check
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // 2. Auth check — extract and verify the user from the request
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader! } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // 3. Role check (if the action is role-specific)
  // Fetch user's role from the `users` table and confirm it matches what this
  // function requires (e.g. only shop_owner can accept/reject requests).

  // 4. Parse and validate input
  const body = await req.json();
  // Validate required fields are present before proceeding.

  // 5. Perform the database action
  const { data, error } = await supabase
    .from("repair_requests")
    .insert({ /* ... */ });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  // 6. Return a consistent success shape
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

## Conventions to follow

- **Always check auth first**, before touching the database.
- **Always check role** for actions restricted to `shop_owner` (accept/reject requests, view revenue) or `customer` (submit requests).
- **Error responses** always follow `{ error: string }` with an appropriate HTTP status (400 for validation, 401 for auth, 403 for role mismatch, 500 for unexpected).
- **Success responses** always follow `{ data: ... }`.
- Keep each function focused on one action — don't combine multiple unrelated operations into one function.
- Add a short comment at the top of each `index.ts` describing what the function does and which role(s) can call it.

## Example prompt to the agent
"Create an Edge Function that lets a shop owner mark a repair request as completed and log the amount charged, following our supabase-edge-function skill."
