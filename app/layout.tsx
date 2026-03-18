import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SequenceFlow Leads",
  description: "Lead generation dashboard for SequenceFlow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
