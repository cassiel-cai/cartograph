import { AppClerkProvider } from "@/components/app-clerk-provider";
import { LocaleRoot } from "@/components/locale-provider";
import { OrgSwitchListener } from "@/components/org-switch-listener";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { serverEnv } from "@/lib/env";
import { LOCALE_BOOTSTRAP } from "@/lib/locale";
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
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <AppClerkProvider>
          <LocaleRoot>
            <OrgSwitchListener />
            {children}
          </LocaleRoot>
        </AppClerkProvider>
      </body>
    </html>
  );
}
