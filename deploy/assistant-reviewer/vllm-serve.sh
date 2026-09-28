#!/usr/bin/env bash
# vLLM serve — locked assistant reviewer (OpenAI-compatible on :8000/v1)
#
# The chat template hardcodes the hub's system prompt and renders only user
# messages, so client-supplied system prompts are ignored at the serving layer.
#
# Usage:
#   MODEL=Qwen/Qwen3.5-9B-Instruct VLLM_API_KEY=change-me ./vllm-serve.sh
set -euo pipefail

MODEL="${MODEL:-Qwen/Qwen3.5-9B-Instruct}"
PORT="${PORT:-8000}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-131072}"
API_KEY="${VLLM_API_KEY:-change-me}"

exec vllm serve "$MODEL" \
  --port "$PORT" \
  --max-model-len "$MAX_MODEL_LEN" \
  --chat-template ./chat-template.jinja \
  --guided-decoding-backend outlines \
  --api-key "$API_KEY" \
  --enable-prefix-caching