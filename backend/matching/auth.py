"""Verifying Supabase access tokens.

Supabase signs access tokens with an asymmetric key (ES256) and publishes the
public keys. Verifying locally against the cached keys means no network call
per request; only the first call, and a key rotation, fetch the key set.
"""

from __future__ import annotations

from collections.abc import Callable

import jwt

TokenVerifier = Callable[[str], str]


class InvalidTokenError(Exception):
    """The token is missing, malformed, expired or not signed by our project."""


def supabase_verifier(supabase_url: str) -> TokenVerifier:
    """Return a function that takes an access token and returns the user's id."""
    base = supabase_url.rstrip("/")
    keys = jwt.PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)

    def verify(token: str) -> str:
        try:
            signing_key = keys.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                issuer=f"{base}/auth/v1",
            )
        except jwt.ExpiredSignatureError as err:
            raise InvalidTokenError("Your session has expired. Please sign in again.") from err
        except (jwt.PyJWTError, jwt.PyJWKClientError) as err:
            raise InvalidTokenError("Please sign in again.") from err
        subject = claims.get("sub")
        if not isinstance(subject, str):
            raise InvalidTokenError("Please sign in again.")
        return subject

    return verify
