// =============================================================================
// Edge Function: get-revenue-stats
// =============================================================================
// Role: shop_owner only
// Description: Computes and returns total revenue statistics based on
//              `completed_repairs` for "this month", "last month", and "all time".
//
// Follows `supabase-edge-function` skill:
//   1. CORS & method check
//   2. Auth check via Authorization header
//   3. Role check (shop_owner only)
//   4. Fetches completed_repairs data
//   5. Calculates time-bucketed revenue totals
//   6. Returns { data: { this_month, last_month, all_time, ... } }
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

  if (req.method !== "POST" && req.method !== "GET") {
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
        JSON.stringify({ error: "Forbidden: Only shop owners can view revenue stats" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch all completed repair records
    const { data: repairs, error: fetchError } = await supabase
      .from("completed_repairs")
      .select("id, amount_charged, completion_date")
      .order("completion_date", { ascending: false });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Calculate date boundaries for "this month" and "last month"
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

    // Last month boundary (handles rollover across January)
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = prevMonthDate.getFullYear();
    const lastMonth = prevMonthDate.getMonth();

    let allTimeRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    for (const item of repairs || []) {
      const amount = Number(item.amount_charged) || 0;
      allTimeRevenue += amount;

      const compDate = new Date(item.completion_date);
      const year = compDate.getFullYear();
      const month = compDate.getMonth();

      if (year === currentYear && month === currentMonth) {
        thisMonthRevenue += amount;
      } else if (year === lastMonthYear && month === lastMonth) {
        lastMonthRevenue += amount;
      }
    }

    // Round amounts to 2 decimal places
    const formatAmount = (val: number) => Math.round(val * 100) / 100;

    // 6. Return consistent success response
    return new Response(
      JSON.stringify({
        data: {
          this_month: formatAmount(thisMonthRevenue),
          last_month: formatAmount(lastMonthRevenue),
          all_time: formatAmount(allTimeRevenue),
          completed_count: (repairs || []).length,
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
