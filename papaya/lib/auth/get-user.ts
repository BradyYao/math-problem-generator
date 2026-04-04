/**
 * Resolve the current user from either a Clerk session or a guest cookie.
 * Returns null if no valid identity found.
 */
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, getUserByGuestToken } from "@/lib/db/queries/users";
import { getGuestTokenFromCookies } from "@/lib/auth/guest";
import type { User } from "@/lib/db/queries/users";

export async function getCurrentUser(req: Request): Promise<User | null> {
  // Try Clerk first
  const { userId: clerkId } = await auth();
  if (clerkId) {
    return getUserByClerkId(clerkId);
  }

  // Fall back to guest cookie
  const guestToken = getGuestTokenFromCookies(req);
  if (guestToken) {
    return getUserByGuestToken(guestToken);
  }

  return null;
}
