import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alwahaa Technical Services",
  description: "Pool Construction Management System",
  icons: {
    icon: [{ url: "/alwahaa-favicon.png", type: "image/png" }],
    shortcut: ["/alwahaa-favicon.png"],
    apple: [{ url: "/alwahaa-favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50">
        {children}
      </body>
    </html>
  );
}
