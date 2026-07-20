import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401)
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: "Invalid session" }, 401)
    }

    const { email_subscription_id } = await req.json()
    if (!email_subscription_id) {
      return json({ error: "Missing email_subscription_id" }, 400)
    }

    const { data: sub, error: subError } = await userClient
      .from("email_subscriptions")
      .select("*")
      .eq("id", email_subscription_id)
      .single()
    if (subError || !sub) {
      return json({ error: "Subscription not found" }, 404)
    }

    if (sub.unsubscribe_method === "one_click_post") {
      if (!sub.unsubscribe_url) {
        return json({ error: "Missing unsubscribe URL" }, 400)
      }
      const res = await fetch(sub.unsubscribe_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      })
      if (!res.ok) {
        const errorMsg = `Unsubscribe request failed (${res.status})`
        await userClient
          .from("email_subscriptions")
          .update({ status: "failed", error: errorMsg })
          .eq("id", email_subscription_id)
        return json({ error: errorMsg }, 500)
      }
    }

    // For 'link'/'mailto' methods the frontend opens the URL itself — there's
    // no reliable way to confirm the user completed it, so this just records
    // intent once they've clicked through.
    await userClient.from("email_subscriptions").update({ status: "unsubscribed", error: null }).eq("id", email_subscription_id)

    return json({ success: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
