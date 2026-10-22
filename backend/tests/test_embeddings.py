import math

from app.core.config import settings
from app.services.embeddings import local_embed


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


def test_vector_has_right_size_and_length_one():
    vec = local_embed("Either party may terminate with sixty days notice", settings.embedding_dim)
    assert len(vec) == settings.embedding_dim
    assert math.isclose(math.sqrt(sum(v * v for v in vec)), 1.0, rel_tol=1e-6)


def test_same_text_gives_same_vector():
    dim = settings.embedding_dim
    assert local_embed("late payment interest", dim) == local_embed("late payment interest", dim)


def test_related_text_scores_higher_than_unrelated():
    dim = settings.embedding_dim
    clause = local_embed("Late invoices accrue interest at 1.5 percent per month", dim)
    related = local_embed("What interest applies to a late invoice?", dim)
    unrelated = local_embed("The office kitchen is cleaned every Friday", dim)
    assert cosine(clause, related) > cosine(clause, unrelated)


def test_empty_text_still_gives_a_valid_vector():
    assert len(local_embed("", settings.embedding_dim)) == settings.embedding_dim