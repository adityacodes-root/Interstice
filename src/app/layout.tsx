import type { Metadata } from "next";
import { DM_Serif_Display } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interstice — Knowledge Exploration Engine",
  description:
    "Follow your curiosity through an infinitely expanding knowledge graph. Explore concepts, uncover connections, and navigate the space between ideas.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("interstice_theme")?.value || "dark";

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${dmSerif.variable} h-full`}
      data-theme={theme}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
      </body>
    </html>
  );
}
