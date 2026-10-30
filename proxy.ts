import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function isPublicPath(pathname: string) {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicPath(req.nextUrl.pathname)) {
      return;
    }

    const { isAuthenticated } = await auth();
    if (!isAuthenticated) {
      const signIn = new URL("/sign-in", req.url);
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
      if (returnTo !== "/") {
        signIn.searchParams.set("redirect_url", returnTo);
      }
      return NextResponse.redirect(signIn);
    }
  },
  { signInUrl: "/sign-in" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
