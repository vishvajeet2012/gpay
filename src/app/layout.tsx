import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Google Pay - Payment Received",
  description: "Payment of ₹20,000.00 successful. Paid to RAHUL MEENA via Google Pay.",
  openGraph: {
    title: "Google Pay - Payment Received",
    description: "Payment of ₹20,000.00 successful. Paid to RAHUL MEENA via Google Pay.",
    images: [
      {
        url: "/pay.jpg",
        width: 600,
        height: 791,
        type: "image/jpeg",
        alt: "Google Pay Payment Received",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Google Pay - Payment Received",
    description: "Payment of ₹20,000.00 successful. Paid to RAHUL MEENA via Google Pay.",
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
