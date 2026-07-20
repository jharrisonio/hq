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

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder("utf-8").decode(bytes)
}

// deno-lint-ignore no-explicit-any
function findPart(payload: any, mimeType: string): any {
  if (!payload) return null
  if (payload.mimeType === mimeType) return payload
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = findPart(part, mimeType)
      if (found) return found
    }
  }
  return null
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => HTML_ENTITIES[m] || m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

// Gmail (web client and API-composed replies alike) wraps quoted history in
// a `gmail_quote`/`gmail_attr` container — cut there so only the new reply
// shows, not the whole thread underneath it.
function trimQuotedHtml(html: string): string {
  let cutIndex = html.length
  for (const marker of [/<div[^>]+class="gmail_quote/i, /<div[^>]+class="gmail_attr/i, /<blockquote/i]) {
    const match = html.match(marker)
    if (match?.index !== undefined && match.index < cutIndex) cutIndex = match.index
  }
  return html.slice(0, cutIndex)
}

function trimQuotedPlainText(text: string): string {
  const lines = text.split("\n")
  const cutoffPatterns = [/^On .+wrote:$/i, /^-{2,}\s*Original Message\s*-{2,}/i, /^From:\s/i, /^>/]
  for (let i = 0; i < lines.length; i++) {
    if (cutoffPatterns.some((p) => p.test(lines[i].trim()))) {
      return lines.slice(0, i).join("\n").trim()
    }
  }
  return text
}

function stripHtml(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
  text = decodeHtmlEntities(text)
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
  return text.trim()
}

// deno-lint-ignore no-explicit-any
function extractBody(payload: any): string {
  const plain = findPart(payload, "text/plain")
  if (plain?.body?.data) {
    return decodeHtmlEntities(trimQuotedPlainText(decodeBase64Url(plain.body.data)))
  }
  const html = findPart(payload, "text/html")
  if (html?.body?.data) {
    return stripHtml(trimQuotedHtml(decodeBase64Url(html.body.data)))
  }
  return ""
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
      .select("gmail_draft_id")
      .eq("id", email_draft_id)
      .single()
    if (draftError || !draft) {
      return json({ error: "Draft not found" }, 404)
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

    const draftRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draft.gmail_draft_id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const draftJson = await draftRes.json()
    if (!draftRes.ok) {
      return json({ error: draftJson.error?.message || "Failed to fetch draft" }, draftRes.status)
    }

    return json({ body: extractBody(draftJson.message?.payload) })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
