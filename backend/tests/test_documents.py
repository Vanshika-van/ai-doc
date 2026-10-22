

def test_owner_can_open_the_original_file_but_others_cannot(client):
    ana, bob = signup(client, "ana@example.com"), signup(client, "bob@example.com")
    doc_id = upload(client, ana, data=b"original text").json()["id"]
    res = client.get(f"/api/documents/{doc_id}/file", headers=ana)
    assert res.status_code == 200 and res.content == b"original text"
    assert res.headers["content-type"].startswith("text/plain") and "inline" in res.headers["content-disposition"]
    assert client.get(f"/api/documents/{doc_id}/file", headers=bob).status_code == 404
    assert client.get(f"/api/documents/{doc_id}/file").status_code == 401