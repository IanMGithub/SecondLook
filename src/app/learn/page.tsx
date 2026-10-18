import type { Metadata } from "next";
import { LearnPatterns } from "@/components/learn-patterns";
import { learnPlaybook, learnSources } from "@/lib/learn-content";

export const metadata: Metadata = {
  title: "Learn · SecondLook",
  description:
    "Common patterns in suspicious messages, and ways to check them through a source you already trust.",
};

export default function LearnPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <section className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Patterns to notice, then check another way.
        </h1>
        <p className="text-lg leading-8 text-stone-700">
          These notes describe patterns that often appear in scam messages.
          They do not decide whether a message you received is fraudulent, and
          they do not verify who sent it.
        </p>
        <nav aria-label="On this page" className="flex flex-wrap gap-3 pt-1">
          <a
            href="#common-scams"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900"
          >
            Common scams guide
          </a>
          <a
            href="#verification-playbook"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900"
          >
            Quick verification playbook
          </a>
        </nav>
      </section>
      <section
        id="common-scams"
        aria-labelledby="common-scams-heading"
        className="scroll-mt-24 space-y-4"
      >
        <h2
          id="common-scams-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Common scams guide
        </h2>
        <LearnPatterns />
      </section>
      <section
        id="verification-playbook"
        aria-labelledby="playbook-heading"
        className="scroll-mt-24 max-w-3xl space-y-4"
      >
        <h2 id="playbook-heading" className="text-2xl font-semibold tracking-tight">
          Quick verification playbook
        </h2>
        <ol className="list-decimal space-y-4 pl-5">
          {learnPlaybook.map((step) => (
            <li key={step} className="pl-1 text-base leading-7 text-stone-800">
              {step}
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="sources-heading" className="max-w-3xl space-y-3">
        <h2 id="sources-heading" className="text-2xl font-semibold tracking-tight">
          Sources
        </h2>
        <p className="text-base leading-7 text-stone-700">
          The descriptions above follow published guidance from the Federal
          Trade Commission and CISA. SecondLook does not add statistics.
        </p>
        <ul className="space-y-2">
          {learnSources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                className="text-base leading-7 font-medium text-accent underline decoration-accent/40 underline-offset-4"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
