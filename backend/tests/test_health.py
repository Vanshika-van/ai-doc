from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_a_report():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert "postgres" in body and "mongo" in body