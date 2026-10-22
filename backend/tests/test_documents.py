import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def temp_upload_dir(tmp_path, monkeypatch):
    """Save test uploads in a throwaway folder, not in the real uploads folder."""
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def signup(client, email="ana@example.com"):
    res = client.post("/api/auth/register", json={"email": email, "name": "Ana", "password": "password123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def upload(client, headers, name="notes.txt", data=b"hello world"):
    return client.post("/api/documents", headers=headers, files={"file": (name, data, "text/plain")})


def test_upload_and_list(client):
    h = signup(client)
    res = upload(client, h)
    assert res.status_code == 201
    assert res.json()["filename"] == "notes.txt" and res.json()["size_bytes"] == 11
    assert [d["filename"] for d in client.get("/api/documents", headers=h).json()] == ["notes.txt"]


def test_upload_is_read_and_chunked_in_background(client):
    h = signup(client)
    text = " ".join(f"sentence number {i}." for i in range(200)).encode()
    doc_id = upload(client, h, data=text).json()["id"]
    doc = client.get("/api/documents", headers=h).json()[0]  # background task has finished by now
    assert doc["status"] == "ready", doc["error"]
    assert doc["chunk_count"] > 1 and doc["page_count"] == 1
    chunks = client.get(f"/api/documents/{doc_id}/chunks", headers=h).json()
    assert len(chunks) == doc["chunk_count"] and chunks[0]["page"] == 1 and chunks[0]["chunk_index"] == 0


def test_pdf_without_text_is_marked_failed(client, tmp_path):
    from pypdf import PdfWriter

    blank = tmp_path / "blank.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)  # a page with no text, like a scan
    writer.write(blank)
    h = signup(client)
    upload(client, h, name="scan.pdf", data=blank.read_bytes())
    doc = client.get("/api/documents", headers=h).json()[0]
    assert doc["status"] == "failed" and "No readable text" in doc["error"]


def test_upload_needs_login(client):
    assert client.post("/api/documents", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 401
    assert client.get("/api/documents").status_code == 401


def test_bad_type_and_empty_file_rejected(client):
    h = signup(client)
    assert upload(client, h, name="virus.exe").status_code == 415
    assert upload(client, h, data=b"").status_code == 400


def test_too_big_file_rejected(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 0)  # 0 MB limit, so any file is too big
    assert upload(client, signup(client)).status_code == 413


def test_users_cannot_see_or_delete_each_others_documents(client):
    ana, bob = signup(client, "ana@example.com"), signup(client, "bob@example.com")
    doc_id = upload(client, ana).json()["id"]
    assert client.get("/api/documents", headers=bob).json() == []
    assert client.delete(f"/api/documents/{doc_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/documents/{doc_id}", headers=ana).status_code == 204
    assert client.get("/api/documents", headers=ana).json() == []