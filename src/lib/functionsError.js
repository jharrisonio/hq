// supabase.functions.invoke() reports a generic "non-2xx status code" message
// on error, discarding the actual error text our functions put in the JSON
// body — that's only reachable via error.context (the raw Response).
export async function extractFunctionError(error) {
  if (!error) return null
  if (error.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // fall through to the generic message
    }
  }
  return error.message
}
