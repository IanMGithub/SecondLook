import { SiteNavCurrent } from "@/components/site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Mark />
          <p className="text-lg font-semibold tracking-tight">SecondLook</p>
        </div>
        <SiteNavCurrent />
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      <rect
        x="3"
        y="7"
        width="16"
        height="18"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="13"
        y="7"
        width="16"
        height="18"
        rx="4"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
