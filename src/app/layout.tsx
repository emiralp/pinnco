import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SAC | Streamlined AI Context by Pinn.co",
  description: "Transform your codebase into an optimized AI-friendly format. Seamlessly integrate your entire project context with AI tools like Claude and ChatGPT.",
  keywords: [
    "AI Context",
    "Code Processing",
    "AI Tools",
    "Claude",
    "ChatGPT",
    "Code Analysis",
    "Developer Tools",
    "Pinn.co"
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <Analytics/>
      </body>
    </html>
  );
}
