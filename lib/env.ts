function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local and restart the process.`,
    );
  }
  return value;
}

export function publicEnv() {
  return {
    clerkPublishableKey: required("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    clerkSignInUrl: required("NEXT_PUBLIC_CLERK_SIGN_IN_URL"),
    clerkSignUpUrl: required("NEXT_PUBLIC_CLERK_SIGN_UP_URL"),
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function serverEnv() {
  return {
    ...publicEnv(),
    clerkSecretKey: required("CLERK_SECRET_KEY"),
  };
}
