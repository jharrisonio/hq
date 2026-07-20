const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"

export function gmailCallbackRedirectUri() {
  return `${window.location.origin}/auth/gmail-callback`
}

export function startGmailConnect() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID,
    redirect_uri: gmailCallbackRedirectUri(),
    response_type: "code",
    scope: GMAIL_SEND_SCOPE,
    access_type: "offline",
    prompt: "consent",
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
