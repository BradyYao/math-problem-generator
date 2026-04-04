import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require a signed-in (not guest) Clerk account
const protectedRoutes = createRouteMatcher([
  "/profile(.*)",
  "/leaderboard/friends(.*)",
  "/challenges/create(.*)",
]);

// Routes that are completely public (marketing, auth pages)
const publicRoutes = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/(.*)",
  "/api/internal/health",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Internal routes require the INTERNAL_API_SECRET header
  if (req.nextUrl.pathname.startsWith("/api/internal/")) {
    const secret = req.headers.get("x-internal-secret");
    if (
      secret !== process.env.INTERNAL_API_SECRET &&
      // Allow Vercel cron with cron secret
      req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protected routes redirect to sign-in if not authenticated
  if (protectedRoutes(req) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
