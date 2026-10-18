import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondLook",
  description:
    "Examine warning signs in a suspicious message and choose safer steps to check it before you act.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="flex min-h-full flex-1 flex-col bg-stone-100 text-stone-950">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
