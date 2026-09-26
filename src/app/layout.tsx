import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { copy } from "@/lib/copy";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
