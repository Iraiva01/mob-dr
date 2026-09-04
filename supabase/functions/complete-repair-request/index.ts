// =============================================================================
// Edge Function: complete-repair-request
// =============================================================================
// Role: shop_owner only
// Description: Marks a repair request as 'completed' and inserts a record into
//              `completed_repairs` with the total amount charged, service date,
//              and optional notes.
//
// Follows `supabase-edge-function` skill:
//   1. CORS & POST method check
//   2. Auth check via Authorization header
//   3. Role check (shop_owner only)
//   4. Input validation (repair_request_id, amount_charged)
//   5. Database update on repair_requests & insert into completed_repairs
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
        JSON.stringify({ error: "Forbidden: Only shop owners can complete repair requests" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate input
    const body = await req.json();
    const { repair_request_id, amount_charged, completion_date, notes } = body;

    if (!repair_request_id || typeof repair_request_id !== "string" || !repair_request_id.trim()) {
      return new Response(JSON.stringify({ error: "repair_request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount_charged === undefined || amount_charged === null || isNaN(Number(amount_charged)) || Number(amount_charged) < 0) {
      return new Response(JSON.stringify({ error: "Valid non-negative amount_charged is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanRequestId = repair_request_id.trim();
    const finalAmount = Number(amount_charged);
    const finalDate = completion_date ? new Date(completion_date).toISOString() : new Date().toISOString();

    // 5. Update repair_requests status to 'completed'
    const { data: updatedRequest, error: updateError } = await supabase
      .from("repair_requests")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanRequestId)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Insert completed_repairs record
    const { data: completedRecord, error: insertError } = await supabase
      .from("completed_repairs")
      .upsert(
        {
          repair_request_id: cleanRequestId,
          amount_charged: finalAmount,
          completion_date: finalDate,
          notes: notes ? String(notes).trim() : null,
        },
        { onConflict: "repair_request_id" }
      )
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Return consistent success shape
    return new Response(
      JSON.stringify({
        data: {
          request: updatedRequest,
          completed_repair: completedRecord,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
