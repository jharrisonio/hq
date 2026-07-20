// gmail.modify covers drafts.get/drafts.send (like gmail.compose), reading
// regular messages/threads (like gmail.readonly), and now messages.modify —
// needed to archive an approved candidate by removing its INBOX label.
// It's a superset of the two scopes this used to request, not a separate
// third one, and still excludes permanent delete.
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.modify"

export function gmailCallbackRedirectUri() {
  return `${window.location.origin}/auth/gmail-callback`
}

export function startGmailConnect() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID,
    redirect_uri: gmailCallbackRedirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
