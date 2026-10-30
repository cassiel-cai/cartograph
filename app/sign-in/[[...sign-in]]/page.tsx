import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Suspense>
        <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-up" />
      </Suspense>
    </div>
  );
}
