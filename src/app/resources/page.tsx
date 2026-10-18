import type { Metadata } from "next";
import {
  resourceGroups,
  resourcesBankGuidance,
  resourcesDirectoryNote,
  resourcesEmergencyNote,
} from "@/lib/resources-content";

export const metadata: Metadata = {
  title: "Resources · SecondLook",
  description:
    "U.S. resources for reporting scams, recovering after fraud, and learning more from official sources.",
};

export default function ResourcesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <section className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Official places to report and recover.
        </h1>
        <p className="text-lg leading-8 text-stone-700">{resourcesDirectoryNote}</p>
        <p className="text-base leading-7 text-stone-700">{resourcesBankGuidance.text}</p>
        <p className="text-sm leading-6 text-stone-600">
          Source:{" "}
          <a
            href={resourcesBankGuidance.sourceHref}
            className="font-medium text-accent underline decoration-accent/40 underline-offset-4"
          >
            {resourcesBankGuidance.sourceLabel}
          </a>
        </p>
      </section>

      {resourceGroups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`${group.id}-heading`}
          className="space-y-4"
        >
          <h2
            id={`${group.id}-heading`}
            className="text-2xl font-semibold tracking-tight"
          >
            {group.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.links.map((link) => (
              <article
                key={link.id}
                className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-5"
              >
                <h3 className="text-lg font-semibold tracking-tight text-stone-950">
                  {link.name}
                </h3>
                <p className="text-base leading-7 text-stone-700">{link.whenUseful}</p>
                <a
                  href={link.href}
                  className="mt-auto text-base font-semibold text-accent underline decoration-accent/40 underline-offset-4"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.linkLabel}
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section
        aria-labelledby="emergency-heading"
        className="max-w-3xl space-y-2 border-t border-stone-200 pt-8"
      >
        <h2 id="emergency-heading" className="text-xl font-semibold tracking-tight">
          Immediate danger
        </h2>
        <p className="text-base leading-7 text-stone-700">{resourcesEmergencyNote}</p>
      </section>
    </main>
  );
}
