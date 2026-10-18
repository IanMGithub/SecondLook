# SecondLook

SecondLook helps people examine a potentially suspicious text message or email before they act. It explains specific warning signs, shows the words those signs come from, and suggests safer ways to check the sender independently.

An assessment is not proof. SecondLook does not claim a message is fraudulent, and it does not call a message safe just because no warning signs were pointed out. Results use friendly headlines for the same underlying assessments: Looks routine (`no_specific_concern`), Double-check (`some_concern`), High concern (`high_concern`), and More context needed (`unclear`). Looks routine means this analysis did not identify a warning sign. It does not authenticate the sender or guarantee the message is safe. A scored result can include a heuristic warning-sign index from 1 to 100. That index is a product-design rubric, not a probability of fraud or harm, and it is not a validated measurement of real-world danger. Optional context is what the user says about the apparent sender and whether the message was expected. It is not verification.

## Run it locally

Requirements: Node.js 22 or newer, and npm. The installed OpenAI SDK declares that engine range. This project was exercised with Node.js 24.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm start
```

`npm test` does not read an API key, spend money, or call OpenAI.

## Configuration

Copy the placeholder file and edit the copy:

```bash
cp .env.example .env.local
```

`.env.example` contains only empty names:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=
# Optional. Server-side OpenAI request deadline in milliseconds (5_000–60_000). Default 30000.
OPENAI_TIMEOUT_MS=
# Optional. Set to 1 for local server diagnostics (elapsed ms, model, timeout, outcome, token counts). Never logs message content.
OPENAI_ANALYZE_DIAGNOSTICS=
```

Set `OPENAI_API_KEY` to your OpenAI key and `OPENAI_MODEL` to the model you want. The recommended model, checked against OpenAI’s docs on October 18, 2026, is `gpt-5-mini`:

```bash
OPENAI_MODEL=gpt-5-mini
```

That model page describes a text model with structured outputs and Responses API support, priced at $0.25 per 1M input tokens and $2 per 1M output tokens. The API is not free. The same page says that for most new low-latency, high-volume workloads OpenAI recommends starting with GPT-5.6 Terra. This project does not switch to that model on its own. Set `OPENAI_MODEL` if you want a different ID. A blank key or a blank model stays in rules mode and does not make a request.

Optional `OPENAI_TIMEOUT_MS` sets the single server-side OpenAI deadline (default 30000, allowed range 5000–60000). Invalid values use the default. Automatic retries stay off. Set `OPENAI_ANALYZE_DIAGNOSTICS=1` only for local debugging; the server then prints one JSON line with elapsed milliseconds, model ID, timeout setting, outcome class, and token counts when available. It never logs the message, model prose, keys, or raw SDK errors.

The key is read only by the server route. Do not put it in `NEXT_PUBLIC_` variables or in `next.config.ts`.

Docs checked for this choice:

- [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini)
- [GPT-5 prompting / reasoning](https://developers.openai.com/api/docs/guides/reasoning)
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Create a response](https://developers.openai.com/api/docs/api-reference/responses/create)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Pricing](https://developers.openai.com/api/docs/pricing)

The adapter uses the installed `openai` package (7.36.0) method `responses.parse` with `zodTextFormat` from `openai/helpers/zod`. That matches the structured-outputs guide.

## Using the page

Paste a message or choose one of three fictional examples, then select Analyze message. Choosing an example fills the box and resets the context choices. It does not analyze the message. The page sends `POST /api/analyze` with that exact text and the selected context.

Two optional choices sit next to the message: who it appears to be from, and whether you were expecting it. The choices are Not sure, Friend or family, Work or school contact, Business or organization, or Unknown sender, and Not sure, Yes, or No. The form says context helps interpret the message, but does not verify the sender. It does not ask for a name, phone number, or account number. Choosing a fictional example resets both choices to Not sure. Context stays in page memory only.

The result shows a friendly concern headline and a short explanation, a concern index when the result is scored, evidence-linked potential concern types when present, an evidence-strength explanation, a user-provided “Context considered” section, highlighted excerpts from the submitted message, safer next steps, and limitations. For Looks routine, empty concern-type and insufficient-score panels stay inside Assessment details instead of looking like a failure. One short qualification stays visible; the full limitations sit in a disclosure. Context is not highlighted inside the message. The index is labeled as a heuristic warning-sign index, not a probability of fraud or harm. “How this is calculated” describes rubric `concern-index-v2`: low counts 15, moderate counts 30, and high counts 45; the strongest linked excerpt counts in full, the second counts half rounded down, and further excerpts add nothing. These weights are product-design choices, not scientifically validated risk estimates, and they are the same weights as v1. User-reported context does not add or remove points. No linked excerpt leaves the index unscored. That empty state is not zero. Looks routine means the analysis explicitly found no warning sign. More context needed means it cannot tell. Neither means the message is safe. An AI result is labeled “AI-assisted analysis.” A rules result is labeled “Limited rules-based analysis,” with a short reason when the model was not used. The page does not mix the two, and it does not show a canned example result when the request fails. The report is built in the browser from the same result, including the context the server echoed and the same caveats. Creating it does not send another model request. Learn has in-page shortcuts to the common-scams guide and verification playbook. Resources is a fixed U.S. directory of official links; SecondLook does not submit a report or send the message to those sites.

Editing the message, changing the context, choosing another example, or selecting Clear cancels the browser request and removes the previous result. Edit message restores the submitted text and context. New analysis clears both. That cancellation does not guarantee the server stops a model request or avoids a charge. A failed request is not retried automatically.

The form says that messages are sent to this server and may be processed by OpenAI. Remove passwords, verification codes, account numbers, and other sensitive details before submitting.

## POST /api/analyze

The endpoint accepts one message and returns an analysis. It does not fetch links in the message, and it does not return the preview fixtures.

Request body:

```json
{ "message": "text to examine" }
```

An optional `context` object may be included. Existing message-only requests stay valid. Omitted context, or an omitted choice, uses `not_sure` for both fields.

```json
{
  "message": "text to examine",
  "context": {
    "apparentSender": "friend_or_family",
    "expected": "yes"
  }
}
```

`apparentSender` is `not_sure`, `friend_or_family`, `work_or_school`, `business_or_organization`, or `unknown_sender`. `expected` is `not_sure`, `yes`, or `no`. Any other value, or an extra field, is rejected. Context is user-reported. The response echoes the validated context. The model is not given a field in which to rewrite it.

`Content-Type` must be `application/json`. Parameters such as `charset=utf-8` are allowed. The message must be a string, must contain non-whitespace text, and must be at most 5,000 JavaScript string units (the same length rule as `"hello".length`). Leading and trailing spaces are kept. Trimming is used only to decide whether the message is blank. The response does not include a copy of the whole submitted text. Indicator excerpts are copied from it.

| Status | Code | When |
| --- | --- | --- |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | The content type is missing or is not JSON. |
| 400 | `INVALID_JSON` | The body is not valid JSON. |
| 400 | `INVALID_REQUEST` | The JSON is not an object with a string `message` and, if present, an allowed `context` object. |
| 400 | `EMPTY_MESSAGE` | `message` is empty or whitespace only. |
| 413 | `MESSAGE_TOO_LONG` | `message` is longer than 5,000 string units. |

A malformed request never calls the model. Every response sends `Cache-Control: no-store`.

Error body:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request must be an object with a message string. Context, if included, must use the allowed choices."
  }
}
```

Success body:

```json
{
  "ok": true,
  "mode": "rules",
  "fallbackReason": "not_configured",
  "context": { "apparentSender": "not_sure", "expected": "not_sure" },
  "analysis": {
    "assessment": "unclear",
    "summary": "What the limited check found.",
    "indicators": [],
    "safeActions": [],
    "limitations": "What the result cannot prove."
  }
}
```

`mode` is `"ai"` or `"rules"`. `fallbackReason` is optional. This app adds it only for rules results:

| Reason | When |
| --- | --- |
| `not_configured` | The key or model is missing or blank. |
| `timeout` | The model request did not finish within the configured OpenAI deadline (default 30 seconds). |
| `rate_limited` | The provider returned HTTP 429. |
| `provider_error` | The provider failed for another reason. |
| `invalid_output` | The model refused, stopped early, failed the schema, or returned an excerpt that is not literally in the message. |

The reason is a category. The response does not include the provider’s error text or the submitted message. An AI result omits `fallbackReason`. Rules output is never labeled as AI output, and the two indicator lists are not merged.

Sample request while `npm run dev` is running, with no key configured:

```bash
curl -s -D - http://localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"message":"Hello"}'
```

Expected result: HTTP 200, `Cache-Control: no-store`, `mode` of `"rules"`, and `fallbackReason` of `"not_configured"`.

The 5,000-character check is an application rule. Request-body size controls, rate limiting, authentication, and other public-deployment protections are not in place. This endpoint is not production-hardened.

## AI mode and rules mode

Both modes return the same analysis fields, plus the user-reported context the server accepted. The server calculates `concernIndex` with rubric `concern-index-v2` after checking the excerpts. The model is not asked for a final score, and context is not a score input. The label follows that index: 40 or more is high concern, and a lower scored result is some concern. No linked excerpt stays unscored. An explicit empty reading can be `no_specific_concern`. Any other unscored result stays `unclear`. The rules engine does not emit `no_specific_concern`, because a missed pattern is not a finding that no warning signs exist. Evidence strength describes whether the linked wording states the concern on its own. It is not a probability, and indicator confidence is not a score multiplier.

**AI mode** runs only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are non-blank. The server sends one Responses API request:

- Fixed instructions are separate from the message. The message is untrusted data.
- No tools, browsing, URL fetching, or conversation history.
- Structured output through a provider schema, then the application schema again. The provider schema asks for excerpt ids, severity, textual support, and concern-type links. A model-supplied score is ignored. Invalid indicator ids or concern-type references discard the whole model result.
- `store` is `false`.
- `max_output_tokens` is 4096. That budget includes reasoning tokens. For the recommended `gpt-5-mini` path, the adapter sends `reasoning.effort: "minimal"` (lowest documented effort for that model on this short structured task) and `text.verbosity: "low"`. It does not switch models on its own.
- Timeout defaults to 30 seconds via `OPENAI_TIMEOUT_MS`, and automatic retries are off.

The application schema rejects blank text with a refinement. That refinement is not part of the JSON Schema subset, so the provider schema is a plain object and the parsed result is checked again with the application schema. A third check requires every `indicator.evidence` string to occur literally in the original message, including case and whitespace. If any excerpt fails, the whole model result is discarded, including its summary, and rules mode is returned with `invalid_output`. Empty indicators are allowed. Duplicate category-and-excerpt pairs are removed.

Instructions that tell the model to ignore text inside the message are not a security guarantee. The runtime checks above still apply. The automated tests use a fake client. They do not show that a live model resists prompt injection.

**Rules mode** is a small deterministic check. It looks only for these patterns:

- A short deadline of minutes or hours together with a threat to restrict an account.
- A request to send or share a password, PIN, or verification code.
- An explicit demand to pay with a gift card or cryptocurrency.
- An overpayment combined with a request to send the extra onward.
- An explicit request to send a home address, a Social Security number, or a bank account number.
- A meeting word together with a secrecy or isolation phrase, such as “come alone” or “don’t tell anyone.”

A nearby “never”, “do not”, or “avoid” suppresses a request pattern. A match inside straight quotes, curly quotes, or guillemets is skipped. Neither check is full language understanding, and the negation window is not a way to reason about abuse or coercion. The rules do not treat the word “bank”, any URL, or any mention of money as a warning. “Never share your code” is not treated as a request to share a code. A normal meeting invitation is not meetup pressure. The noun “meeting” in a workplace note is not an invitation. “What is your address?” is not a privacy request. A picnic photo, an ordinary reimbursement, and a library pickup notice are not patterns. The rules can link scam or fraud, privacy exposure, and meetup pressure. They do not identify harassment, personal coercion, or impersonation. User-reported context is not used. The rules do not know whether a sender is familiar or a message was expected, and they do not lower a credential request, a gift-card demand, or a secrecy phrase for that reason. No matching pattern means `unclear`, which does not mean the message is safe and is not the “no specific concern” label. The limitations say the result is limited rules-based analysis. Safe actions are fixed sentences chosen from the matched scenario. An account-restriction sentence can still match without a credential request. The rules cannot tell a workplace IT notice that uses that sentence from a scam.

If the model is configured and then times out, is rate limited, fails, refuses, or returns output that fails the checks, the response is a new rules analysis. It is not a mix of the two.

## Local smoke test

This is opt-in and is not part of `npm test`. Start the app, then run:

```bash
npm run smoke:analyze
```

It posts one fictional message to `http://localhost:3000/api/analyze`. If the server has a key and a model, that request can spend money. The script prints only HTTP status, success, mode, assessment, indicator count, and a fallback reason when one is present. It does not print environment files, the message, or provider errors.

## Evaluation

`src/lib/evaluation-cases.ts` holds 35 fictional cases, including paired context cases. They separate four questions:

- Software correctness: the response envelope, the analysis schema, exact excerpts, provenance, inert HTML and links, no canned-result substitution, no stale result, and an empty indicator list shown as a normal result.
- Rules-engine limits: each case records what the current patterns do, including messages they leave unclear.
- Live-model quality: a person reviews explanations with the rubric below. The cases do not require one model label when the message is ambiguous.
- Fallback behavior: a `rules` result includes `fallbackReason`. That row is a rules fallback, not an AI quality sample.

This set is not an accuracy benchmark. `npm test` does not measure scam detection. An excerpt that matches the message exactly still does not prove the explanation is right, and keyword overlap is not a quality score.

A valid analysis with `indicators: []` is a normal unscored result. Rules mode labels that `unclear`. An AI result can label it `no_specific_concern` when the model says no warning sign was identified. The page says no excerpts are highlighted and that the absence of warning signs does not establish safety. It is not an error. Mocked tests do not show that a live model’s false positives improved.

### Manual quality rubric

Read a live result against the cited excerpts. Do not score it by searching for keywords.

1. Do the explanations follow from the cited excerpts?
2. Does the summary overstate what the text establishes?
3. Is the advice relevant and proportionate?
4. Do routine or educational messages get unnecessary alarm?
5. Do instructions inside the message change the analysis task?

### Opt-in live run

`npm run evaluate:live` does not send requests by itself. To send fictional cases to a local server, one at a time:

```bash
npm run evaluate:live -- --confirm --limit 3
```

`--limit` defaults to 3 and cannot exceed the case list. If the server has an API key and a model, each case can call OpenAI and spend money. The command prints a cost warning, records mode and `fallbackReason`, and writes `evaluation-reports/live-*.json` only after `--confirm`. Reports stay out of Git. The script does not print credentials, the message, the model’s prose, or raw provider errors. Do not treat the report as a detection score. The expanded case set is not an accuracy benchmark.

A separate opt-in comparison sends fictional pairs twice, once without context and once with it. It still requires `--confirm`. The default is 2 pairs, which is 4 requests. It does not run as part of `npm test`.

```bash
npm run evaluate:live -- --confirm --context-pairs --limit 2
```

That writes `evaluation-reports/context-*.json`. A rules row in that file does not show that live false positives improved. Do not put real private conversations in either command.

## What the tests cover

`npm test` checks the rules, the request shape, mocked provider failures, evidence checks, the route’s validation, the page’s request helper with a fake `fetch`, and the evaluation cases against the current rules. It also renders the result markup to confirm HTML-like text stays text and that an empty indicator list is a result rather than an error. It does not call OpenAI, spend money, or prove that the live page’s keyboard and layout behavior works. It does not establish how often the rules or a live model recognize suspicious messages.

## Privacy

Submitting Analyze message sends the message to this app’s server. The server does not intentionally save or log it. In AI mode, the message content is sent to OpenAI. Rules mode does not send it to OpenAI. Changing or clearing the text in the browser does not erase a request that has already reached the model.

`store: false` tells the Responses API not to keep the response for later retrieval. The create API defaults `store` to true, and a true value stores response data for at least 30 days. OpenAI’s data-controls page also says abuse-monitoring logs can be retained for up to 30 days unless the organization has an approved retention control such as Zero Data Retention. `store: false` is not a promise that the provider keeps nothing.

## Not implemented yet

- Opening or scanning links from a message
- Accounts, a database, or saved history
- Transport body-size limits, rate limiting, authentication, and deployment protections

## Main files

| File | Purpose |
| --- | --- |
| `package.json` | Scripts and dependencies. The npm package name is `secondlook`. |
| `package-lock.json` | Exact dependency versions installed by npm. |
| `next.config.ts` | Next.js configuration, including the Tailwind loader used by Turbopack. |
| `tsconfig.json` | TypeScript settings. `@/*` imports map to the `src` directory. |
| `eslint.config.mjs` | ESLint configuration from the Next.js starter. |
| `src/app/layout.tsx` | Root page shell, title, and description. |
| `src/app/page.tsx` | Homepage header and introduction. |
| `src/app/globals.css` | Tailwind import, light theme colors, system font, and focus outline. |
| `src/components/message-review.tsx` | Message box, example buttons, and live submission state. |
| `src/components/analysis-result.tsx` | Assessment, highlights, evidence, next steps, and limitations. |
| `src/lib/analyze-request.ts` | Browser request, response checks, and stale-result handling. |
| `src/lib/examples.ts` | Fictional example messages. The page does not ship their canned results. |
| `src/lib/analysis.ts` | Enum values and the labels shown in a result. Result types come from the shared schema. |
| `src/lib/contract.ts` | Zod schemas for a message, an analysis, and the API envelopes. |
| `src/lib/fixtures.ts` | Fictional messages paired with canned results for schema tests. |
| `src/lib/evaluation-cases.ts` | Fictional review cases, rules limits, and the manual quality rubric. |
| `src/lib/live-evaluation.ts` | Opt-in live-run plan and report records. No network calls. |
| `src/lib/highlight-evidence.ts` | Finds literal excerpts to highlight in a result. |
| `src/lib/rules-analyzer.ts` | Limited deterministic patterns and fixed safe actions. |
| `src/lib/validate-evidence.ts` | Literal excerpt check and duplicate removal. |
| `src/server/analyze-message.ts` | Chooses AI or rules and checks the final result. |
| `src/server/openai-analyzer.ts` | Server-only OpenAI request. The client is created per call. |
| `src/app/api/analyze/route.ts` | `POST /api/analyze`. Reads configuration and returns analysis. |
| `src/lib/analyze-request.test.ts` | Fake-fetch and stale-request tests. |
| `src/components/analysis-result.test.tsx` | Result markup, including HTML-like text. |
| `src/components/message-review.test.tsx` | Initial page copy. It does not click through the form. |
| `src/lib/contract.test.ts` | Schema and request-parsing tests. |
| `src/lib/rules-analyzer.test.ts` | Rules patterns, negations, and concern combinations. |
| `src/lib/evaluation-cases.test.tsx` | Mechanical checks for the review cases. Not a detection score. |
| `src/server/analyze-message.test.ts` | Orchestration with an injected provider. |
| `src/server/openai-analyzer.test.ts` | Request shape and mocked provider outcomes. |
| `src/app/api/analyze/route.test.ts` | Tests for the real request handler. |
| `scripts/smoke-analyze.ts` | Opt-in local smoke test. Not run by `npm test`. |
| `scripts/evaluate-live.ts` | Opt-in sequential evaluation. Not run by `npm test`. |
| `src/app/favicon.ico` | Browser tab icon from the starter. |
| `.env.example` | Empty `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, and `OPENAI_ANALYZE_DIAGNOSTICS` placeholders. |
| `.gitignore` | Skips dependencies, build output, real environment files, and `evaluation-reports/`. `.env.example` is the exception. |
| `AGENTS.md` | Notes generated by Next.js for coding agents. |
