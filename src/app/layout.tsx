import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondLook",
  description:
    "Examine warning signs in a suspicious message and choose safer steps to check it before you act.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
