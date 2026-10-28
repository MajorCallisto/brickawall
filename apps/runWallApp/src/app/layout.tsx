import type { Metadata } from "next";
import { Inter, Old_Standard_TT } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oldStandard = Old_Standard_TT({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-old-standard",
  display: "swap",
});


export const metadata: Metadata = {
  title: "runWall",
  description:
    "An interactive 3D wall for tracking progress. Progress is built brick by brick.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${oldStandard.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
