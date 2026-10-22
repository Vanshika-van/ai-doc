from pathlib import Path

from pypdf import PdfReader


def extract_pages(path: str) -> list[tuple[int, str]]:
    """Read a file and return [(page_number, text), ...]. Text files count as one page."""
    suffix = Path(path).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(path)
        # page numbers start at 1, like in a real book
        return [(i, page.extract_text() or "") for i, page in enumerate(reader.pages, start=1)]
    # .txt and .md: errors="replace" avoids crashing on odd characters
    return [(1, Path(path).read_text(encoding="utf-8", errors="replace"))]