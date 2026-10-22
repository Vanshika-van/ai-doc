from app.services.chunking import chunk_pages, split_text


def test_short_text_is_one_chunk():
    assert split_text("Hello world.", size=100, overlap=10) == ["Hello world."]


def test_empty_text_gives_no_chunks():
    assert split_text("   \n  ", size=100, overlap=10) == []


def test_long_text_is_split_with_overlap_and_nothing_is_lost():
    text = " ".join(f"word{i}" for i in range(400))
    chunks = split_text(text, size=200, overlap=40)
    assert len(chunks) > 5
    assert all(len(c) <= 200 for c in chunks)
    assert all(a[-10:] in b for a, b in zip(chunks, chunks[1:]))  # neighbours share text
    assert chunks[0].startswith("word0") and chunks[-1].endswith("word399")


def test_chunks_remember_their_page():
    out = chunk_pages([(1, "first page text"), (2, "second page text")], size=100, overlap=10)
    assert out == [(1, "first page text"), (2, "second page text")]