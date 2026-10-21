USER = {"email": "ana@example.com", "name": "Ana", "password": "password123"}


def register(client, **overrides):
    return client.post("/api/auth/register", json={**USER, **overrides})


def test_register_returns_token_and_hides_password(client):
    res = register(client)
    assert res.status_code == 201
    body = res.json()
    assert body["access_token"] and body["user"]["email"] == "ana@example.com"
    assert "password" not in str(body)


def test_duplicate_email_is_rejected_case_insensitively(client):
    register(client)
    assert register(client, email="ANA@example.com").status_code == 409


def test_short_password_and_bad_email_are_rejected(client):
    assert register(client, password="short").status_code == 422
    assert register(client, email="nope").status_code == 422


def test_login_success_and_failures(client):
    register(client)
    ok = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    bad = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "wrongwrong"})
    unknown = client.post("/api/auth/login", json={"email": "who@example.com", "password": "password123"})
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json()  # does not reveal which emails exist


def test_me_needs_a_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    token = register(client).json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200 and res.json()["name"] == "Ana"