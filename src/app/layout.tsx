import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shifuto",
  description: "シフト管理アプリケーション",
  openGraph: {
    title: "Shifuto",
    description: "シフト管理アプリケーション",
    siteName: "Shifuto",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shifuto',
    description: 'シフト管理アプリケーション',
  },
  appleWebApp: {
    title: 'Shifuto',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = null;
  let userName = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    role = profile?.role || null;
    userName = profile?.full_name || user.email;
  }

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white text-gray-900`}
      >
        {user && <Navbar user={user} role={role} userName={userName} />}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
