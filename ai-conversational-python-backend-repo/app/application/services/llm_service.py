"""Provider adapter for structured LLM calls.

This service hides provider-specific request details from the chat use-case so
the rest of the application can work with a single structured JSON contract.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import get_settings


class LlmService:
    @staticmethod
    def _extract_json_text(content: str) -> str:
        """Strip markdown fences when a provider wraps JSON in code blocks."""

        trimmed = (content or "").strip()
        if trimmed.startswith("```"):
            trimmed = trimmed.replace("```json", "").replace("```", "").strip()
        return trimmed

    @staticmethod
    async def _call_openrouter(messages: list[dict], max_tokens: int) -> dict:
        """Send a structured JSON chat completion request to OpenRouter."""

        settings = get_settings()
        payload = {
            "model": settings.openrouter_model or settings.llm_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": settings.llm_temperature,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key or settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        timeout = settings.openrouter_timeout_ms / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(settings.openrouter_api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
        return json.loads(LlmService._extract_json_text(content))

    @staticmethod
    async def _call_groq(messages: list[dict], max_tokens: int) -> dict:
        """Send a structured JSON chat completion request to Groq's OpenAI-compatible API."""

        settings = get_settings()
        payload = {
            "model": settings.groq_model or settings.llm_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": settings.llm_temperature,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key or settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        timeout = settings.groq_timeout_ms / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(settings.groq_api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
        return json.loads(LlmService._extract_json_text(content))

    @staticmethod
    async def _call_gemini(messages: list[dict], max_tokens: int) -> dict:
        """Send a structured JSON chat completion request to the Gemini API."""

        settings = get_settings()
        system_message = next((msg["content"] for msg in messages if msg["role"] == "system"), "")
        contents = []
        for message in messages:
            if message["role"] == "system":
                continue
            role = "model" if message["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": message["content"]}]})
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": settings.llm_temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
            "system_instruction": {"parts": [{"text": system_message}]},
        }
        timeout = settings.gemini_timeout_ms / 1000
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent?key={settings.google_api_key or settings.llm_api_key}"
        )
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts)
        return json.loads(LlmService._extract_json_text(text))

    @staticmethod
    async def call_structured_json(messages: list[dict], max_tokens: int = 700) -> dict[str, Any]:
        """Dispatch to the configured provider and return parsed JSON."""

        settings = get_settings()
        provider = settings.llm_provider.strip().lower()
        if provider == "groq":
            return await LlmService._call_groq(messages, max_tokens)
        if provider == "gemini":
            return await LlmService._call_gemini(messages, max_tokens)
        return await LlmService._call_openrouter(messages, max_tokens)
