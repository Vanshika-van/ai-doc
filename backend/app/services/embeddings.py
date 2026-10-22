"""Turn text into a list of numbers (a "vector") so that computers can compare meaning.

Two modes:
  * OPENAI_API_KEY set  -> real embeddings from OpenAI. They understand meaning ("car" ~ "automobile").
  * no key (default)    -> a simple local method that counts shared words. Free and works offline,
                           but it does NOT understand meaning, only matching words.
"""
import hashlib
import math
import re

from app.core.config import settings

WORD = re.compile(r"[a-z0-9]+")
# Very common words carry no meaning for search, so we skip them
STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "was", "were", "be",
    "it", "this", "that", "with", "as", "by", "at", "from", "what", "who", "how", "when", "do",
    "does", "can", "we", "you", "i", "if", "any",
}


def stem(word: str) -> str:
    """Crude: cut common endings so "invoices" and "invoice" count as the same word."""
    for ending in ("ing", "ed", "es", "s"):
        if word.endswith(ending) and len(word) - len(ending) >= 3 and not word.endswith("ss"):
            return word[: -len(ending)]
    return word


def local_embed(text: str, dim: int) -> list[float]:
    """Hashing trick: every word is assigned to one of `dim` slots (using a hash).
    Texts that share words end up with similar numbers."""
    words = [stem(w) for w in WORD.findall(text.lower()) if w not in STOPWORDS]
    features = words + [f"{a}_{b}" for a, b in zip(words, words[1:])]  # single words + word pairs
    vec = [0.0] * dim
    for feature in features:
        digest = hashlib.md5(feature.encode("utf-8")).digest()
        slot = int.from_bytes(digest[:4], "big") % dim
        vec[slot] += 1.0 if digest[4] % 2 == 0 else -1.0
    length = math.sqrt(sum(v * v for v in vec))
    if length == 0:  # empty text: return a valid vector anyway
        vec[0] = 1.0
        return vec
    return [v / length for v in vec]  # make the vector length 1, so cosine comparison is fair


def openai_embed(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI  # imported here so the app runs without the openai package

    client = OpenAI(api_key=settings.openai_api_key)
    result = []
    for i in range(0, len(texts), 64):  # send in batches of 64
        response = client.embeddings.create(
            model=settings.embedding_model, input=texts[i : i + 64], dimensions=settings.embedding_dim
        )
        result.extend(item.embedding for item in response.data)
    return result


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if settings.openai_api_key:
        return openai_embed(texts)
    return [local_embed(t, settings.embedding_dim) for t in texts]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]