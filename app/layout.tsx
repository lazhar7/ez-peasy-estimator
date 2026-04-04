import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Peasy AI Estimator | Easy Peasy Movers",
  description:
    "Professional moving estimate tool. Calculate cubic feet, shipment weight, truck size, and crew from any inventory list.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
