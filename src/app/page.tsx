import { MessageReview } from "@/components/message-review";

export default function Home() {
  return (
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
      </section>
      <MessageReview />
    </main>
  );
}
