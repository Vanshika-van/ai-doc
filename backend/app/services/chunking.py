def split_text(text: str, size: int, overlap: int) -> list[str]:
    """Cut text into pieces of about `size` characters. Neighbours share `overlap` characters,
    so a sentence cut at the edge still appears whole in one of the two pieces."""
    text = " ".join(text.split())  # tidy: collapse spaces, tabs and line breaks into single spaces
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            # try to stop at a sentence end, else at a space, so words are not cut in half
            cut = max(text.rfind(". ", start + size // 2, end), text.rfind(" ", start + size // 2, end))
            if cut != -1:
                end = cut + 1
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)  # step back by `overlap`, but always move forward
    return chunks


def chunk_pages(pages: list[tuple[int, str]], size: int, overlap: int) -> list[tuple[int, str]]:
    """Chunk each page separately, so every chunk knows its page number: [(page, text), ...]"""
    return [(page, piece) for page, text in pages for piece in split_text(text, size, overlap)]