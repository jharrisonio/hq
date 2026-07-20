import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CLIENT_ID = Deno.env.get("GOOGLE_GMAIL_CLIENT_ID")!
const CLIENT_SECRET = Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET")!
const REDIRECT_URI = Deno.env.get("GOOGLE_GMAIL_REDIRECT_URI")!

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 })
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 })
    }
    const userId = userData.user.id

    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 })
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: "Token exchange failed", detail: tokenJson }), { status: 400 })
    }
    if (!tokenJson.refresh_token) {
      return new Response(
        JSON.stringify({
          error:
            "No refresh token returned — revoke HQ's access at myaccount.google.com/permissions and try connecting again",
        }),
        { status: 400 }
      )
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

    const expiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
    const { error: upsertError } = await serviceClient.from("user_google_tokens").upsert({
      user_id: userId,
      refresh_token: tokenJson.refresh_token,
      access_token: tokenJson.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
