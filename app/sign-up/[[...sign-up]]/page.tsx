import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Suspense>
        <SignUp fallbackRedirectUrl="/" signInUrl="/sign-in" />
      </Suspense>
    </div>
  );
}
