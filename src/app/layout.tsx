import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Agent",
  description: "AI-powered technical interview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
