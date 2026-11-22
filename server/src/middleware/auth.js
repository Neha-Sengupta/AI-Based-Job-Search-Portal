import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";

async function getSessionUser(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session
    ? { id: session.user.id, name: session.user.name, email: session.user.email }
    : null;
}

// 🔐 routes: no valid session → 401. A forged cookie simply finds no session.
export async function requireAuth(req, _res, next) {
  const user = await getSessionUser(req);
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in.");
  req.user = user;
  next();
}

// 🔓🔐 routes: public, with extra data when signed in.
export async function optionalAuth(req, _res, next) {
  req.user = (await getSessionUser(req)) ?? undefined;
  next();
}
