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

    const { email_draft_id } = await req.json()
    if (!email_draft_id) {
      return json({ error: "Missing email_draft_id" }, 400)
    }

    const { data: draft, error: draftError } = await userClient
      .from("email_drafts")
      .select("*")
      .eq("id", email_draft_id)
      .single()
    if (draftError || !draft) {
      return json({ error: "Draft not found" }, 404)
    }
    if (draft.status === "sent") {
      return json({ success: true, alreadySent: true })
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from("user_google_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .single()
    if (tokenError || !tokenRow) {
      return json({ error: "Gmail is not connected for this account" }, 400)
    }

    let accessToken: string
    try {
      accessToken = await refreshAccessToken(tokenRow.refresh_token)
    } catch (e) {
      return json({ error: `Token refresh failed: ${e}` }, 500)
    }

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: draft.gmail_draft_id }),
    })
    const sendJson = await sendRes.json().catch(() => ({}))

    if (!sendRes.ok) {
      await userClient
        .from("email_drafts")
        .update({ status: "failed", error: sendJson.error?.message || "Send failed" })
        .eq("id", email_draft_id)
      return json({ error: sendJson.error?.message || "Send failed" }, 500)
    }

    const now = new Date().toISOString()
    await userClient.from("email_drafts").update({ status: "sent", sent_at: now }).eq("id", email_draft_id)

    if (draft.task_id) {
      await userClient.from("tasks").update({ status: "done", updated_at: now }).eq("id", draft.task_id)
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
