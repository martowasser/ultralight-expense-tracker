import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "monthly expense tracker",
  description: "track your recurring monthly expenses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fafafa] text-[#171717]">
        {children}
      </body>
    </html>
  );
}
