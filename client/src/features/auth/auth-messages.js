// Better Auth error → the message the user sees.
export function authErrorMessage(error) {
  if (!error) return null;
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (error.code?.startsWith("USER_ALREADY_EXISTS"))
    return "An account with this email already exists.";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
    return "Email or password is incorrect.";
  }
  return "Something went wrong. Please try again.";
}

// Only same-site paths, so a crafted link can't send users to another site after sign-in.
export function safeCallbackUrl(value, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
