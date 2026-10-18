import { learnPatterns, type LearnPattern } from "@/lib/learn-content";

const accents: Record<LearnPattern["id"], string> = {
  urgency: "border-t-amber-700",
  impersonation: "border-t-accent",
  credentials: "border-t-stone-700",
  payment: "border-t-accent",
  overpayment: "border-t-amber-700",
  links: "border-t-stone-700",
};

export function LearnPatterns() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {learnPatterns.map((pattern) => (
        <article
          key={pattern.id}
          className={`flex flex-col gap-4 rounded-3xl border border-stone-200 border-t-4 bg-white p-5 ${accents[pattern.id]}`}
        >
          <PatternMark id={pattern.id} />
          <h3 className="text-xl font-semibold tracking-tight text-stone-950">
            {pattern.title}
          </h3>
          <p className="text-base leading-7 text-stone-700">{pattern.summary}</p>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-stone-500">Fictional example</h4>
            <p className="text-base leading-7 text-stone-800 [overflow-wrap:anywhere]">
              {pattern.example}
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-stone-500">Watch for</h4>
            <p className="text-base leading-7 text-stone-700">{pattern.watchFor}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-stone-500">Verify</h4>
            <p className="text-base leading-7 text-stone-700">{pattern.verify}</p>
          </div>
          <details className="text-sm leading-6 text-stone-700">
            <summary className="cursor-pointer font-medium text-stone-950">
              More context
            </summary>
            <p className="mt-2">{pattern.details}</p>
          </details>
        </article>
      ))}
    </div>
  );
}

function PatternMark({ id }: { id: LearnPattern["id"] }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="text-stone-800"
    >
      {id === "urgency" ? <UrgencyMark /> : null}
      {id === "impersonation" ? <ImpersonationMark /> : null}
      {id === "credentials" ? <CredentialMark /> : null}
      {id === "payment" ? <PaymentMark /> : null}
      {id === "overpayment" ? <OverpaymentMark /> : null}
      {id === "links" ? <LinkMark /> : null}
    </svg>
  );
}

function UrgencyMark() {
  return (
    <>
      <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 16v9l6 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function ImpersonationMark() {
  return (
    <>
      <circle cx="18" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 34c1.5-6 5-8 10-8s8.5 2 10 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="31" cy="17" r="5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
      <path d="M24 33c1.2-4 3.5-6 7-6 3.2 0 5.6 1.4 7 5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
    </>
  );
}

function CredentialMark() {
  return (
    <>
      <rect x="8" y="20" width="22" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M14 20v-4a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="28" r="1.5" fill="currentColor" />
      <path d="M32 24h8M36 24v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function PaymentMark() {
  return (
    <>
      <rect x="7" y="14" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 20h26" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="34" cy="30" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M34 27v6M31.5 30h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function OverpaymentMark() {
  return (
    <>
      <path d="M8 16h20M8 24h28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 32H12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 28l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function LinkMark() {
  return (
    <>
      <rect x="6" y="18" width="14" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="18" width="14" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M36 14l6-6M42 8v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}
