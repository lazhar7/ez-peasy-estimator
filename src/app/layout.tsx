import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Peasy AI Estimator",
  description:
    "Estimate inventory totals for cleanouts and moves with a polished workflow built for future Zillow and photo ingestion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
