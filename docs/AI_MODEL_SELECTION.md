# AI Model Selection — IP Screening & Research Disclosure Intelligence

**Status:** Recommendation (validated) · **Date:** 2026-09-27 · **Scope:** `docs/disclosure.md` Part 6 deliverable
**Decision:** Adopt **Qwen3.5-9B-Instruct** as the self-hosted assistant-reviewer model, with **Gemma 4 12B** as the primary alternative and **NuExtract3 / GLiNER-2** as specialized companions for extraction and triage.

---

## 1. Context and requirements

The hub screens confidential research disclosures before publication. The AI assists a human reviewer; it never decides. From `docs/disclosure.md` Parts 6–9 and the implemented codebase:

| Requirement | Detail |
|---|---|
| Tasks | Risk classifier (LOW/MEDIUM/HIGH), IP-type classifier (10 categories), confidential-info detector, public-disclosure risk, ownership review, authenticity/consistency check, prior-art search, public teaser generation |
| Output contract | Strict structured JSON — the app validates every AI result with Zod schemas (`lib/ipScreenSchema.ts`, `lib/matchRankingSchema.ts`, `lib/newsDraftSchema.ts`, `lib/scoutNewsSchema.ts`) and rejects ungrounded output |
| Reasoning | Findings must be source-linked (grounded in the disclosure text); ungrounded claims are dropped, never shown |
| Privacy | Unpublished research, patent strategy, sensitive data — inference must be self-hostable with zero egress |
| Fine-tuning | Classification, extraction, triage behaviour, consistent reasoning format (Part 9); RAG for changing institutional policy |
| Integration seam | `ASSISTANT_REVIEWER_KEY` / `ASSISTANT_REVIEWER_MODEL` / `ASSISTANT_REVIEWER_BASE_URL` — an OpenAI-compatible `/chat/completions` endpoint (`server/services/aiGateway.ts:133`) |
| Budget reality | University context; dev machine has no CUDA (7.7 GB integrated GPU); production would be a rented single GPU |

## 2. Evaluation criteria (from Part 6)

License · Reasoning ability · Context length · Fine-tuning capability · Unsloth compatibility · VRAM requirements · Inference cost · Self-hosting · Privacy · Structured JSON output · Performance on classification/extraction tasks.

## 3. Candidate landscape (as of September 2026)

| Model | Params | Context | License | Structured JSON | Unsloth | Notes |
|---|---|---|---|---|---|---|
| **Qwen3.5-9B** (Mar 2026) | 9B dense | 262K native, 1M ext. | Apache 2.0 | Strong; Zod-validated in-app | Full support, day-zero | New Gated-DeltaNet architecture; beats Qwen3-14B on most benchmarks |
| Qwen3.5-4B | 4B dense | 262K native | Apache 2.0 | Good | Full support | CPU/edge tier; base of NuExtract3 |
| Qwen3.5-35B-A3B | 35B total / 3B active MoE | 262K native | Apache 2.0 | Strong | Full support (bf16 LoRA, 74 GB) | High-throughput production tier |
| Qwen3-8B / 14B (Apr 2025) | 8.2B / 14.8B dense | 32K native, 128K YaRN | Apache 2.0 | Decent (14B: 0.69 on LLMStructBench) | Full support | **Superseded by Qwen3.5**; no 8B/14B exists in the Qwen3.5 line |
| Gemma 4 12B (Apr 2026) | 12B dense | 256K | Apache 2.0 | **Excellent** — Gemma3 already led LLMStructBench (12B: 0.72, 27B: 0.74); Gemma 4 adds native JSON + function calling | Full support | Strongest structured-output family per independent benchmark |
| Gemma 4 26B-A4B | 25.2B total / 3.8B active MoE | 256K | Apache 2.0 | Excellent | Full support | #6 on Arena AI; Q4 14.4 GB |
| Mistral Small 4 (Mar 2026) | 24B dense | 128K | Apache 2.0 | Good | Supported | Heavier than Qwen3.5-9B for the same class; no advantage here |
| Llama 4 Scout / Maverick (Apr 2025) | 109B / 400B total, 17B active MoE | 10M / 1M | **Llama 4 Community License** — not OSI | Good | Supported | Rejected: 700M-MAU clause, EU multimodal carve-out, "Built with Llama" attribution, derivative naming; 4-bit Scout ≈ 54.5 GB (80 GB accelerator); retired from Groq/Together in 2026; Meta calls Maverick "previous model" |
| NuExtract3 (2026) | 4B VLM (Qwen3.5-4B base) | 131K | Apache 2.0 | **Specialist**: document→JSON extraction, RL-trained | Supported | Companion for claim/entity/citation extraction; beats generalists on extraction benchmarks (0.651 vs Qwen3.5-9B 0.479) |
| GLiNER-2 | 209M–1B | — | Apache 2.0 | NER + classification + structured parsing | — | CPU-capable (<100 ms); high-volume triage |

## 4. Recommendation: Qwen3.5-9B-Instruct

The original "Qwen3 8B/14B" direction is **validated in family but outdated in version**. Qwen3.5 (February 2026) replaced the Qwen3 dense line: the 8B/14B sizes no longer exist — **9B is their successor**, and it is strictly better.

Why Qwen3.5-9B:

1. **License.** Apache 2.0, OSI-approved, no MAU clause, no attribution or derivative-naming obligations, no EU carve-out. Cleanest possible position for a university deployment. (Llama 4 fails this test.)
2. **Capability per parameter.** Independent comparison (llmbase.ai, 12 benchmarks) shows Qwen3.5-9B beating Qwen3-14B decisively: GPQA 80.6% vs 47.0%, IFBench 66.7% vs 23.9%, TAU-bench v2 86.8% vs 32.2%, HLE 13.3% vs 4.2%. The Gated-DeltaNet + attention hybrid architecture is a generational jump.
3. **Context.** 262,144 tokens native — a full disclosure packet plus RAG policy context fits in one prompt; no chunking complexity.
4. **Structured JSON.** Qwen3-14B scored 0.69 on LLMStructBench (Feb 2026, independent); Qwen3.5 is a newer generation. Critically, the app does not trust model output — every result is Zod-validated and grounding-checked, so residual JSON drift is caught and rejected, not displayed.
5. **Fine-tuning.** Unsloth has day-zero support: bf16 LoRA at **22 GB VRAM** (single 24 GB GPU), 1.5× faster, 50% less VRAM than FA2. This matches the Part 9 plan (classification/extraction/triage fine-tune).
6. **Deployment.** vLLM and sglang serve it with an OpenAI-compatible API — the exact contract `ASSISTANT_REVIEWER_BASE_URL` already speaks. Ollama/llama.cpp GGUF builds exist for dev.
7. **Privacy.** Fully self-hosted; zero egress. Multimodal (image-text-to-text) leaves the door open for scanned documents later.

### Hardware tiers

| Tier | Hardware | Model / quant | Notes |
|---|---|---|---|
| Dev / edge | CPU-only, 8–16 GB RAM | Qwen3.5-4B Q4_K_M (~3 GB) | The 7.7 GB Iris Plus machine can run this, slowly; fine for smoke tests |
| Minimum GPU | 8 GB VRAM | Qwen3.5-9B Q4_K_M (5.75 GB weights, ~6.3 GB at 16K ctx) | Default pick per ModelFit (probed 2026-09-02) |
| **Recommended production** | **24 GB VRAM (RTX 4090/3090, A10)** | **Qwen3.5-9B bf16 or Q4 + bf16 LoRA fine-tuning** | Fine-tuning fits (22 GB); inference is fast |
| High throughput | 48 GB+ | Qwen3.5-35B-A3B (3B active) | MoE throughput; bf16 LoRA needs 74 GB |

### The "Qwen 8B instruct" question

If you already pulled `qwen3:8b` (Qwen3-8B-Instruct, April 2025): it works, but it is the previous generation. For the same download size you get Qwen3.5-9B, which is measurably better and has 8× the native context (262K vs 32K). **Download `qwen3.5:9b` instead** — or `qwen3.5:4b` if the target machine is CPU-only.

### GGUF source: unsloth/Qwen3.5-9B-GGUF (verified 2026-09-27)

The official Unsloth quant of Qwen3.5-9B (Apache 2.0, ~1.4M downloads/month) is
the primary GGUF source — same toolchain as the fine-tuning path, so the served
model matches the post-fine-tune export. Ollama pulls it straight from Hugging
Face:

```bash
ollama run hf.co/unsloth/Qwen3.5-9B-GGUF:Q4_K_M        # 5.68 GB, HF-verified on T4
ollama run hf.co/unsloth/Qwen3.5-9B-GGUF:UD-Q4_K_XL    # 5.97 GB, Dynamic 2.0
# or download the file directly:
huggingface-cli download unsloth/Qwen3.5-9B-GGUF --include "Qwen3.5-9B-Q4_K_M.gguf"
```

Two Qwen3.5 specifics: **thinking mode is default** (disable via
`enable_thinking: false` — the deploy Modelfile/template does this, since
thinking blocks break the hub's JSON output), and the model is **multimodal**
(vision encoder unused for text disclosures, but a free future option for
scanned documents).

## 5. Why not the alternatives

- **Llama 4 Scout/Maverick** — rejected on license (custom Community License: 700M-MAU clause, EU multimodal carve-out, attribution + derivative naming) and hardware (109B/400B total params; 4-bit Scout ≈ 54.5 GB needs an 80 GB accelerator). Ecosystem momentum has moved on: Groq retired both variants in 2026, Together removed them from serverless, and Meta's April 2026 announcement calls Maverick its "previous model".
- **Mistral Small 4** — Apache 2.0 and solid, but 24B dense is 2.7× the weights of Qwen3.5-9B for no advantage on this task set; 128K context vs 262K.
- **Qwen3-8B/14B** — superseded by Qwen3.5-9B (see above).
- **Gemma 4 as primary** — not rejected; it is the strongest challenger. Gemma3-12B/27B topped the independent LLMStructBench structured-JSON leaderboard (0.72/0.74, above Qwen3-14B's 0.69), and Gemma 4 adds native JSON output and function calling. **If structured-output reliability becomes the dominant failure mode in pilot testing, switch the primary to Gemma 4 12B** (Q4 6.7 GB, 256K context, Apache 2.0, Unsloth-supported) — the integration seam is identical. Qwen3.5-9B wins on fine-tuning maturity (day-zero Unsloth support, established GGUF ecosystem) and the Qwen family's proven extraction lineage (NuExtract3).

## 6. Structured-output evidence

- **LLMStructBench** (arXiv 2602.14743, Feb 2026): 22 open models, 5 prompting strategies. Gemma3-12B 0.72, Gemma3-27B 0.74, Llama3.1-70B 0.73, Qwen3-14B 0.69, Qwen3-8B 0.65. Key finding: prompting strategy matters as much as model size; document-level validity is prompt-sensitive. Predates Qwen3.5/Gemma 4.
- **NuExtract3 benchmark** (2026): on document→JSON extraction, the specialized 4B NuExtract3 (0.651) beats generalists including Qwen3.5-9B (0.479) — generalist reasoning loops hurt small models on extraction. This is why the recommendation pairs a generalist reviewer with a specialist extractor (below).
- **In-app safety net**: every AI write path is Zod-validated and grounding-checked (`ipScreenSchema`, `matchRankingSchema`, `newsDraftSchema`, `scoutNewsSchema`); malformed or ungrounded output is rejected, never persisted. Model choice is therefore a quality lever, not a safety boundary.

## 7. Fine-tuning plan (Part 9)

- **Method:** bf16 LoRA. **QLoRA (4-bit) is not recommended for Qwen3.5** — the Gated-DeltaNet layers quantize poorly during training (Unsloth guidance; theLAB wiki confirms 4-bit measurably hurts it).
- **Stack:** Unsloth + TRL SFTTrainer. Version pins: `transformers == 5.5.0` (v5 required for Qwen3.5; Unsloth caps at 5.5.0), `numpy < 2.3`, strip the MTP head for qwen3next-style loaders.
- **VRAM:** 9B bf16 LoRA = 22 GB → one 24 GB GPU or Colab A100. 4B = 10 GB (free Colab notebooks exist).
- **Dataset:** labeled closed cases (the deferred fine-tuning item) — classification labels, IP-type labels, grounded-reasoning exemplars, and the app's own rejected-output logs as negative examples.
- **Scope:** classification, extraction, triage behaviour, consistent reasoning format. Keep institutional policy in RAG, not weights.

## 8. Deployment

```
ASSISTANT_REVIEWER_KEY=<any non-AIza value>
ASSISTANT_REVIEWER_MODEL=Qwen/Qwen3.5-9B-Instruct
ASSISTANT_REVIEWER_BASE_URL=http://<host>:8000/v1
```

- **Production:** `vllm serve Qwen/Qwen3.5-9B-Instruct --port 8000 --max-model-len 131072` (OpenAI-compatible; the app's existing `/chat/completions` branch works unchanged).
- **Dev:** `ollama run hf.co/unsloth/Qwen3.5-9B-GGUF:Q4_K_M` (or `:4B` on CPU-only machines).
- **Fallback chain is unchanged:** if the local reviewer is down, `generateWithAssistantReviewer` falls back to the Gemini/Groq gateway — screening remains advisory and human review is never bypassed.

## 9. Specialized companions

- **NuExtract3 (4B, Apache 2.0)** — for the claim/entity/citation extraction components and any scanned-document intake. RL-trained extraction reasoning, reasoning on/off, vLLM-serveable. Pairs with the generalist reviewer.
- **GLiNER-2 (209M–1B, Apache 2.0)** — CPU-capable NER/classification/structured parsing for high-volume triage (e.g., pre-filtering which disclosures need the full LLM pass).

## 10. Risks and open questions

1. **Benchmark recency.** Qwen3.5-9B's headline wins are from a third-party comparison site; the independent LLMStructBench predates Qwen3.5. Mitigation: run a 20–30 case pilot against the app's own Zod-validated schemas before committing.
2. **Gemma 4 challenger.** If structured-output failures dominate the pilot, re-evaluate Gemma 4 12B (same seam, one-line change).
3. **Fine-tuning hardware.** 22 GB bf16 LoRA requires a rented GPU or Colab; the dev machine cannot train. Budget accordingly.
4. **CPU-only dev machine.** 9B Q4 on the 7.7 GB Iris Plus is usable for smoke tests but not for tuning prompts; use 4B locally, 9B on the server.
5. **Quantization floor.** Q4_K_M is the floor for Qwen3.5 (Kaitchup evaluation: avoid Q2; Q3 only if forced). Never ship Q2 for a screening model.

## 11. Decision summary

| Decision | Choice |
|---|---|
| Primary self-hosted reviewer | **Qwen3.5-9B-Instruct** (Apache 2.0, 262K ctx, bf16 LoRA @ 22 GB, vLLM/Ollama-ready) |
| Primary alternative | Gemma 4 12B — switch if structured-output reliability dominates pilot failures |
| High-throughput tier | Qwen3.5-35B-A3B (3B active MoE) |
| Edge / CPU-only | Qwen3.5-4B |
| Extraction specialist | NuExtract3 (4B) |
| Triage classifier | GLiNER-2 |
| Rejected | Llama 4 (license + hardware), Mistral Small 4 (no advantage), Qwen3-8B/14B (superseded) |
| Download answer | **`unsloth/Qwen3.5-9B-GGUF:Q4_K_M`** (official Unsloth quant, 5.68 GB) — not `qwen3:8b`; same size class, strictly better, 8× context |

## 12. Security hardening and hosting

The model is deployed **locked to the hub's system design** — it cannot be
repurposed as a general chatbot. Four layers, in `deploy/assistant-reviewer/`:

1. **Serving lock** — `Modelfile` (Ollama) and `chat-template.jinja` (vLLM)
   hardcode the hub's system prompt; client-supplied system messages are
   ignored at the serving layer.
2. **Gateway** — `gateway.mjs` requires an API key, discards any injected
   system prompt, injects the locked prompt, and rejects non-JSON output
   (smoke-tested: 8/8 enforcement checks pass).
3. **App validation** — Zod schemas, grounding checks, human-only decisions
   (already built; the real safety boundary).
4. **Network isolation** — private endpoint; only the hub server holds the key.

**Hosting:** no free cloud provides persistent production GPU serving. Use
Google Colab free (T4) for dev/testing, Hugging Face Spaces (free, CPU-only)
for a persistent 4B endpoint, **university cloud credits** (AWS Educate /
Azure for Students / Google Cloud for Education) for the production 24 GB GPU
box, or ~$10–30/month on RunPod/Vast.ai/Modal as fallback. Full setup in
`deploy/assistant-reviewer/README.md`.