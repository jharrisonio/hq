// gmail.compose covers drafts.get (reading a draft's content) as well as
// drafts.send — narrower than gmail.readonly/gmail.modify, which would grant
// access to the whole mailbox instead of just draft management.
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose"

export function gmailCallbackRedirectUri() {
  return `${window.location.origin}/auth/gmail-callback`
}

export function startGmailConnect() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID,
    redirect_uri: gmailCallbackRedirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
