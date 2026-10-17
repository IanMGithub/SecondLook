# SecondLook

SecondLook helps people examine a potentially suspicious text message or email before they act. It explains specific warning signs, shows the words those signs come from, and suggests safer ways to check the sender independently.

An assessment is not proof. SecondLook does not claim a message is fraudulent, and it does not call a message safe just because no warning signs were pointed out. It does not reduce a message to a scam score.

## Run it locally

Requirements: Node.js 20.9 or newer, and npm. This project was created with Node.js 24.

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

## Frontend preview

The page lets you paste a message or load one of three fictional examples, then choose Preview analysis.

- An example fills the text box and does not run on its own.
- Preview analysis shows that example’s predefined mock result only when the text still matches it exactly.
- Any other message, including an edited example, explains that live analysis is not connected.
- The message stays in the page while it is open. It is not sent to a server or saved.

This preview does not call `/api/analyze`. A mock result on the page is not a live analysis.

## POST /api/analyze

The live endpoint accepts a message and checks its shape. It does not analyze the message. A valid request receives HTTP 503 because live analysis is not connected.

Request body:

```json
{ "message": "text to examine" }
```

`Content-Type` must be `application/json`. Parameters such as `charset=utf-8` are allowed. The message must be a string, must contain non-whitespace text, and must be at most 5,000 JavaScript string units (the same length rule as `"hello".length`). Leading and trailing spaces are kept. Trimming is used only to decide whether the message is blank. The response does not include the submitted text.

| Status | Code | When |
| --- | --- | --- |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | The content type is missing or is not JSON. |
| 400 | `INVALID_JSON` | The body is not valid JSON. |
| 400 | `INVALID_REQUEST` | The JSON is not an object whose only field is a string `message`. |
| 400 | `EMPTY_MESSAGE` | `message` is empty or whitespace only. |
| 413 | `MESSAGE_TOO_LONG` | `message` is longer than 5,000 string units. |
| 503 | `ANALYSIS_UNAVAILABLE` | The message is valid, and analysis is not connected. |

Error body:

```json
{
  "ok": false,
  "error": {
    "code": "ANALYSIS_UNAVAILABLE",
    "message": "Live analysis is not connected yet."
  }
}
```

A later success response is planned to use `mode` of `"ai"` or `"rules"` and an `analysis` object with the same fields as the preview. The route does not return that yet, and it has no mock success mode:

```json
{
  "ok": true,
  "mode": "rules",
  "analysis": {
    "assessment": "unclear",
    "summary": "What the message appears to be doing.",
    "indicators": [],
    "safeActions": [],
    "limitations": "What the text cannot prove."
  }
}
```

Sample request while `npm run dev` is running:

```bash
curl -s -D - http://localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"message":"Hello"}'
```

Expected result: HTTP 503, `Cache-Control: no-store`, and the `ANALYSIS_UNAVAILABLE` body above.

The 5,000-character check is an application rule. Request-body size controls, rate limiting, and other public-deployment protections are not in place. This endpoint is not production-hardened. It does not log the message, store it, or open links inside it.

## Not implemented yet

- Live analysis, whether by rules or an AI model
- An API key or model SDK
- Connecting the page to `/api/analyze`
- Opening or scanning links from a message
- Accounts, a database, or saved history
- Transport body-size limits, rate limiting, and deployment protections

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
| `src/components/message-review.tsx` | Message box, example buttons, and preview state. |
| `src/components/analysis-preview.tsx` | Mock result layout. |
| `src/lib/analysis.ts` | Enum values and the labels shown in the preview. Result types come from the shared schema. |
| `src/lib/contract.ts` | Zod schemas for a message, an analysis, and the API envelopes. |
| `src/lib/fixtures.ts` | Fictional messages and the mock results stored with them. |
| `src/lib/highlight-evidence.ts` | Finds literal excerpts to highlight in the preview. |
| `src/app/api/analyze/route.ts` | `POST /api/analyze`. Validates the request and reports that analysis is not connected. |
| `src/lib/contract.test.ts` | Schema and request-parsing tests. |
| `src/app/api/analyze/route.test.ts` | Tests for the real `POST` handler. |
| `src/app/favicon.ico` | Browser tab icon from the starter. |
| `.gitignore` | Tells Git to skip dependencies, build output, and environment files such as `.env`. |
| `AGENTS.md` | Notes generated by Next.js for coding agents. |
