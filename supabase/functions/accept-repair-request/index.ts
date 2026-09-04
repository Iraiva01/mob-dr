// =============================================================================
// Edge Function: accept-repair-request
// =============================================================================
// Role: shop_owner only
// Description: Sets the status of a repair request to 'accepted'.
//
// Follows `supabase-edge-function` skill:
//   1. CORS & POST method check
//   2. Auth check via Authorization header
//   3. Role check (shop_owner only)
//   4. Input validation (repair_request_id)
//   5. Database update
//   6. Returns { data } on success or { error } on failure
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // 1. CORS / method check
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Auth check — extract and verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Role check — verify shop_owner role server-side
    const { data: userProfile, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !userProfile) {
      return new Response(JSON.stringify({ error: "Forbidden: User profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userProfile.role !== "shop_owner") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only shop owners can accept repair requests" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate input
    const body = await req.json();
    const { repair_request_id } = body;

    if (!repair_request_id || typeof repair_request_id !== "string" || !repair_request_id.trim()) {
      return new Response(JSON.stringify({ error: "repair_request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Perform the database action
    const { data, error } = await supabase
      .from("repair_requests")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", repair_request_id.trim())
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Return consistent success shape
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
