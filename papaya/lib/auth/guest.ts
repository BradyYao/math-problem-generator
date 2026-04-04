import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { createGuestUser, getUserByGuestToken } from "@/lib/db/queries/users";
import type { User } from "@/lib/db/queries/users";

export const GUEST_COOKIE = "papaya_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Get or create a guest user from the cookie */
export async function getOrCreateGuestUser(): Promise<{
  user: User;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(GUEST_COOKIE)?.value;

  if (existingToken) {
    const user = await getUserByGuestToken(existingToken);
    if (user) return { user, isNew: false };
  }

  // Create a new guest token + user
  const token = nanoid(32);
  const user = await createGuestUser(token);

  // Set cookie (caller's route handler must set this on the response)
  // We return the token so the route can set it
  return { user: { ...user, guest_token: token }, isNew: true };
}

export function buildGuestCookie(token: string): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  return {
    name: GUEST_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function getGuestTokenFromCookies(
  req: Request
): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GUEST_COOKIE}=`));
  return match ? match.split("=")[1] : null;
}
