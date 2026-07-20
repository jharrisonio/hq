// gmail.compose covers drafts.get/drafts.send. Showing the original email a
// draft replies to needs threads.get on a regular (non-draft) message, which
// requires gmail.readonly on top — gmail.compose alone doesn't cover reading
// arbitrary received mail, only draft management. Kept as two scopes rather
// than jumping to gmail.modify, since we don't need write access to regular
// messages (labeling/archiving is Cowork's job via its own connector).
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ")

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
