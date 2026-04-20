import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
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
  title: "Papaya — Math practice that adapts to you",
  description:
    "On-demand K–12 math practice problems matched to your skill level and available time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <header className="flex justify-end p-4">
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton />
            </Show>
            <Show when="signed-in">
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors"
                >
                  My Stats
                </Link>
                <UserButton />
              </div>
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
