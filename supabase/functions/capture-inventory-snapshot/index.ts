import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Solo quien tenga el service_role key puede invocar esta función (p. ej. GitHub Actions cron)
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Opcional: body puede traer { "p_captured_at": "2025-02-09T00:00:00.000Z" } para pruebas
    let pCapturedAt: string | undefined
    if (req.method === "POST" && req.headers.get("Content-Type")?.includes("application/json")) {
      try {
        const body = await req.json()
        if (body?.p_captured_at) pCapturedAt = body.p_captured_at
      } catch {
        // body vacío o inválido: usar "now"
      }
    }
    const capturedAt = pCapturedAt ?? new Date().toISOString()

    const { data, error } = await supabase.rpc("capture_inventory_snapshots", {
      p_captured_at: capturedAt,
    })

    if (error) {
      console.error("RPC capture_inventory_snapshots error:", error)
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("Snapshot OK, rows:", data)
    return new Response(
      JSON.stringify({ success: true, inserted: data, captured_at: capturedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Edge Function error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
