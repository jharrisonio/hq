import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CLIENT_ID = Deno.env.get("GOOGLE_GMAIL_CLIENT_ID")!
const CLIENT_SECRET = Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET")!

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

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error_description || json.error || "Token refresh failed")
  return json.access_token as string
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
    const userId = userData.user.id

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
    const now = new Date().toISOString()
    await userClient.from("email_subscriptions").update({ status: "unsubscribed", error: null }).eq("id", email_subscription_id)
    if (sub.task_id) {
      await userClient.from("tasks").update({ status: "done", updated_at: now }).eq("id", sub.task_id)
    }

    // Best-effort: archive the thread now that we've unsubscribed. Doesn't
    // fail the whole request if this part errors — the unsubscribe itself
    // already succeeded.
    if (sub.thread_id) {
      try {
        const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
        const { data: tokenRow } = await serviceClient
          .from("user_google_tokens")
          .select("refresh_token")
          .eq("user_id", userId)
          .single()
        if (tokenRow) {
          const accessToken = await refreshAccessToken(tokenRow.refresh_token)
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${sub.thread_id}/modify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
          })
        }
      } catch (_e) {
        // Non-fatal — the unsubscribe itself succeeded either way.
      }
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
