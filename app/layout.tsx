import { OrgSwitchListener } from "@/components/org-switch-listener";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { serverEnv } from "@/lib/env";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "A dependency map drawn from parsed source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  serverEnv();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/sign-in"
          appearance={{
            variables: {
              borderRadius: "2px",
              fontFamily: "var(--font-geist-sans)",
            },
          }}
        >
          <OrgSwitchListener />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
