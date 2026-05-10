"""
Embedding generation using fastembed (ONNX-based, CPU-friendly, ~150MB).
Model: BAAI/bge-small-en-v1.5 — 384-dimensional vectors, fast, accurate.
Falls back gracefully if fastembed is not installed.
"""
from __future__ import annotations

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
            _model = TextEmbedding("BAAI/bge-small-en-v1.5")
        except Exception:
            _model = None
    return _model


def embed_text(text: str) -> list[float] | None:
    model = _get_model()
    if model is None:
        return None
    result = list(model.embed([text]))
    return result[0].tolist() if result else None


def embed_batch(texts: list[str]) -> list[list[float]] | None:
    model = _get_model()
    if model is None:
        return None
    return [v.tolist() for v in model.embed(texts)]


def profile_to_text(profile: dict) -> str:
    skills = ", ".join(profile.get("skills") or []) or "general skills"
    return (
        f"single parent education career support | "
        f"field of study: {profile.get('field_of_study') or 'undecided'} | "
        f"education level: {profile.get('education_level') or 'some college'} | "
        f"state: {profile.get('state') or 'United States'} | "
        f"income bracket: {profile.get('income_bracket') or 'low income'} | "
        f"family size: {profile.get('family_size') or 2} people | "
        f"skills: {skills} | "
        f"hours available per week: {profile.get('hours_per_week') or 15} | "
        f"childcare needed: {profile.get('childcare_needed') or False}"
    )


def embed_profile(profile: dict) -> list[float] | None:
    return embed_text(profile_to_text(profile))
