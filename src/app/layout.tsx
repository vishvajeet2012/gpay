import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Welcome",
  description: "Mobile experience",
  openGraph: {
    title: "Welcome",
    description: "Mobile experience",
    images: [
      {
        url: "/pay.png",
        alt: "Pay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Welcome",
    description: "Mobile experience",
    images: ["/pay.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
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
      <body className="min-h-dvh flex flex-col bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
