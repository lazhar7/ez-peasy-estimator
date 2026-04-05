# Easy Peasy AI Estimator

Zillow-first household inventory estimation built with Next.js, TypeScript, and Tailwind.

The current app flow is:

1. Paste a Zillow listing URL.
2. The app attempts to retrieve listing details and listing photo URLs.
3. The listing data is sent into the inventory inference layer.
4. The generated inventory is loaded into the editable estimator table.
5. The existing estimate engine calculates cubic feet, estimated weight, truck recommendation, crew recommendation, labor range, confidence, and totals.

## Inference Modes

The app supports two inventory inference modes behind the same estimator flow:

- `heuristic`
  Uses the built-in fallback provider. It does not perform real image understanding. It infers probable inventory from listing details, listing photo availability, and room cues.
- `vision`
  Uses a concrete OpenAI Responses API vision integration. If the provider is not configured or the request fails, the app falls back to the heuristic provider without breaking the Zillow flow.

## Real Vision Provider

The first concrete real vision provider is OpenAI Responses API with image input plus structured JSON output.

The integration sends:

- listing details
- live listing photo URLs
- room hints and captions
- instructions for directional inventory estimation
- a strict JSON schema for the returned inventory response

The provider returns and the app normalizes:

- `inventoryRows`
- `overallConfidence`
- `assumptions`
- `narrative`
- `providerNotes`

Returned rows are normalized into the existing `InventoryItem` shape and passed directly into the current estimator flow.

## Debug Mode

Development-only debug mode is controlled by:

```bash
AI_INFERENCE_DEBUG=true
```

When enabled locally, the API/UI expose safe debug information only, with no secrets:

- whether Zillow photo URLs were extracted
- how many photos were sent to OpenAI
- which provider and model were requested and used
- whether real vision succeeded or the app fell back
- normalized inventory rows before they enter the estimator
- provider notes and confidence
- classified failure stage

Debug mode is off by default and should remain off in production unless you intentionally need it.

## Environment Variables

Copy `.env.example` to `.env.local`.

### Heuristic mode

```bash
AI_INFERENCE_PROVIDER=heuristic
AI_INFERENCE_DEBUG=false
```

### OpenAI vision mode

```bash
AI_INFERENCE_PROVIDER=vision
AI_INFERENCE_DEBUG=true
AI_VISION_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
AI_VISION_MODEL=gpt-4.1-mini
```

Optional overrides:

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
AI_VISION_MAX_PHOTOS=8
AI_VISION_ENDPOINT=https://api.openai.com/v1/responses
AI_VISION_API_KEY=optional_override_for_openai_api_key
```

## Local Testing

1. Create `.env.local` from `.env.example`.
2. Set:

```bash
AI_INFERENCE_PROVIDER=vision
AI_INFERENCE_DEBUG=true
AI_VISION_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
AI_VISION_MODEL=gpt-4.1-mini
```

3. Start the app:

```bash
npm install
npm run dev
```

4. Paste a Zillow listing URL.
5. Check:
   - pipeline status
   - inference provider badge
   - provider notes
   - dev debug panel

If real OpenAI vision is used successfully, you should see:

- provider used: `openai-responses`
- provider status: `success`
- photos sent to provider: greater than `0`
- model used: your configured OpenAI model

If the app falls back, the debug panel will classify the failure stage:

- `zillow-retrieval`
- `missing-photos`
- `provider-config`
- `provider-auth`
- `provider-response`
- `provider-network`

## OpenAI Vision Request Shape

The OpenAI integration uses the Responses API with image inputs and structured JSON output. It sends:

- one text instruction block summarizing the listing
- one `input_image` item per live listing photo URL
- a strict JSON schema for structured inventory output

This follows OpenAI’s official docs for image inputs in the Responses API and structured outputs:

- [Images and vision](https://developers.openai.com/api/docs/guides/images-vision)
- [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API reference](https://platform.openai.com/docs/api-reference/responses/create)

## Verification

```bash
npm run lint
npm run build
```
