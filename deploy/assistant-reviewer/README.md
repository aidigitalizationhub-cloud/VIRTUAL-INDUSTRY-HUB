# Locked assistant-reviewer deployment

The self-hosted Qwen3.5-9B assistant reviewer, locked so it can only serve the
Virtual Industry Hub's IP-screening system design.

## Security model (defense in depth)

| Layer | Control | Where |
|---|---|---|
| 1. Serving lock | Model server only renders the hub's system prompt; client-supplied system messages are ignored | `Modelfile` (Ollama) or `chat-template.jinja` (vLLM) |
| 2. Gateway | API key required; client system prompts discarded and replaced with the locked prompt; non-JSON output rejected | `gateway.mjs` |
| 3. App validation | Zod schemas, grounding checks, human-only decisions (already built) | `lib/*Schema.ts`, `server/routes/*` |
| 4. Network isolation | Endpoint private; only the hub server holds the key | hosting platform |

The model never talks to researchers directly. Only the hub server calls it,
with fixed prompts. Even if an attacker reached the endpoint, they would need
the gateway key, their injected instructions would be discarded, and the model
would refuse anything outside the screening task.

## Files

- `Modelfile` — Ollama image with the locked system prompt baked in; pulls
  `unsloth/Qwen3.5-9B-GGUF` (official Unsloth quant, Apache 2.0) straight from
  Hugging Face and disables Qwen3.5's default thinking mode (which would break
  the hub's JSON output)
- `chat-template.jinja` — vLLM chat template that hardcodes the locked system
  prompt and renders only user messages (Qwen chat format)
- `vllm-serve.sh` — vLLM launch script (OpenAI-compatible, guided decoding)
- `gateway.mjs` — thin Node gateway: key check, prompt lock, JSON output check
- `colab/ug-ip-reviewer.ipynb` — ready-to-upload Colab notebook: serving +
  tunnel for testing, Unsloth fine-tuning for later advancements

## Model: unsloth/Qwen3.5-9B-GGUF

Official Unsloth conversion of Qwen3.5-9B (the post-trained instruct model),
Apache 2.0, ~1.4M downloads/month. Chosen over community quants because the
fine-tuning path uses the same Unsloth toolchain — the GGUF you serve after
fine-tuning matches the base you tested with.

- `Q4_K_M` (5.68 GB) — default; HF-verified on a T4 (same GPU as Colab free)
- `UD-Q4_K_XL` (5.97 GB) — Unsloth Dynamic 2.0 quant, slightly better accuracy
- Pull directly: `ollama run hf.co/unsloth/Qwen3.5-9B-GGUF:Q4_K_M`

Two Qwen3.5 specifics to know:

1. **Thinking mode is default** — Qwen3.5 emits `<thinking>` blocks before
   answering. The `Modelfile` TEMPLATE and the fine-tune dataset cell disable
   it (`enable_thinking: false`), so the model answers directly in JSON.
2. **It is a vision model** — Qwen3.5-9B has a vision encoder (the GGUF repo
   ships `mmproj-F16.gguf`). The hub feeds it text, so the encoder is unused
   overhead, but it is a free future option for screening scanned documents.

## Hosting options (free → production)

### 1. Google Colab free (T4 16 GB) — development/testing only
Qwen3.5-9B Q4_K_M (5.68 GB) fits easily. Sessions die after a few hours, so
this is for integration testing, not production. Use the notebook in
`colab/ug-ip-reviewer.ipynb` (serving + tunnel, then fine-tuning).

### 2. Hugging Face Spaces (free, persistent, CPU-only) — 4B model
Free Spaces get 2 vCPU / 16 GB RAM — enough for Qwen3.5-4B Q4 (~3 GB), slow
but persistent. Create a Space with a Dockerfile that runs Ollama + the
gateway, expose the gateway port. Use `qwen3.5:4b` in the Modelfile.

### 3. University cloud credits — the production answer
AWS Educate, Azure for Students, and Google Cloud for Education all grant free
credits that cover GPU instances. Check whether the University of Ghana
already has an education-cloud program. A 24 GB GPU instance (RTX 4090 / A10)
runs Qwen3.5-9B with headroom for bf16 LoRA fine-tuning (22 GB).

```bash
# On the GPU instance:
./vllm-serve.sh          # serves :8000 with the locked template
node gateway.mjs         # serves :8080 -> :8000, enforces the lock
```

Hub `.env`:
```
ASSISTANT_REVIEWER_KEY=<gateway key>
ASSISTANT_REVIEWER_MODEL=Qwen/Qwen3.5-9B-Instruct
ASSISTANT_REVIEWER_BASE_URL=http://<instance>:8080/v1
```

### 4. Cheap paid fallback (~$10–30/month)
RunPod / Vast.ai (~$0.20–0.40/hr for 24 GB GPUs), Modal ($30/month free
credits), Lightning.ai (free tier with limited GPU hours). Same deployment as
option 3.

## Honest limits

- No free cloud provides persistent production GPU serving. Free = dev/testing
  (Colab/Kaggle) or a small persistent CPU box (HF Spaces, 4B model).
- The serving lock and gateway make abuse hard but are not cryptographic
  guarantees; the app's Zod + grounding validation remains the real safety
  boundary, and a fine-tune (deferred) is what makes the lock behavioural.
- QLoRA is not recommended for Qwen3.5 (DeltaNet layers quantize poorly in
  training) — fine-tune with bf16 LoRA (22 GB for 9B).