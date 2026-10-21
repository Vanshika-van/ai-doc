from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_is_not_the_password_and_verifies():
    hashed = hash_password("correct horse")
    assert hashed != "correct horse"
    assert verify_password("correct horse", hashed)
    assert not verify_password("wrong", hashed)


def test_same_password_gives_different_hashes():
    assert hash_password("same-password") != hash_password("same-password")  # random salt


def test_token_round_trip():
    assert decode_access_token(create_access_token(42)) == 42


def test_tampered_or_garbage_token_is_rejected():
    token = create_access_token(42)
    assert decode_access_token(token[:-2] + "xx") is None
    assert decode_access_token("not-a-token") is None