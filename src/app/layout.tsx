import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Welcome",
  description: "Mobile experience",
  openGraph: {
    title: "Welcome",
    description: "Mobile experience",
    images: [
      {
        url: "/pay.jpg",
        width: 600,
        height: 791,
        type: "image/jpeg",
        alt: "Pay",
      },
      {
        url: "/pay.png",
        width: 600,
        height: 791,
        type: "image/png",
        alt: "Pay",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Welcome",
    description: "Mobile experience",
    images: ["/pay.jpg"],
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
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-white text-[#1f1f1f] font-sans">
        {children}
      </body>
    </html>
  );
}
