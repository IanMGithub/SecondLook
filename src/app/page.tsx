import { MessageReview } from "@/components/message-review";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-stone-100 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Mark />
          <p className="text-lg font-semibold tracking-tight">SecondLook</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="space-y-4">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Before you act, understand the message.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-stone-700">
            Examine warning signs, understand the evidence behind them, and
            choose safer steps to check a message before you reply, click, or
            pay.
          </p>
          <p className="max-w-2xl rounded-2xl border border-accent/20 bg-white px-4 py-3 text-sm leading-6 text-stone-700">
            Frontend preview — examples use mock analysis. Live analysis is not
            connected yet.
          </p>
        </section>
        <MessageReview />
      </main>
    </div>
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
