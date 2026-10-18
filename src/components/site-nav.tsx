"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Analyze" },
  { href: "/learn", label: "Learn" },
  { href: "/resources", label: "Resources" },
] as const;

export function SiteNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Primary" className="flex gap-1 rounded-full bg-stone-100 p-1">
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-stone-950 shadow-sm"
                : "rounded-full px-4 py-1.5 text-sm font-semibold text-stone-700"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteNavCurrent() {
  return <SiteNav pathname={usePathname()} />;
}
