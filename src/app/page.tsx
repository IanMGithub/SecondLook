import { Suspense } from "react";
import { connection } from "next/server";
import { MessageReview } from "@/components/message-review";
import { resolveDeploymentMode } from "@/lib/deployment-mode";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
          <section className="space-y-4">
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Before you act, understand the message.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-700">
              Loading the interactive demo…
            </p>
          </section>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

/**
 * Reads deployment mode at request time so a local .env.local cannot bake a
 * live analyzer UI into a demo host. Browser toggles cannot enable live mode.
 */
async function HomeContent() {
  await connection();
  const deploymentMode = resolveDeploymentMode(
    process.env.SECONDLOOK_DEPLOYMENT_MODE,
  );

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
        {deploymentMode === "demo" ? (
          <p
            role="status"
            className="max-w-2xl rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base leading-7 text-stone-700"
          >
            Interactive demo: choose a practice message to explore a prewritten
            assessment. This demo does not analyze your own messages or call an
            AI service.
          </p>
        ) : null}
      </section>
      <MessageReview deploymentMode={deploymentMode} />
    </main>
  );
}
