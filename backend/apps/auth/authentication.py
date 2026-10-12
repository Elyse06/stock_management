from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .tokens import ACCESS, TokenInvalide, charger_utilisateur, decoder


class JWTAuthentication(BaseAuthentication):
    keyword = b"bearer"

    def authenticate(self, request):
        parties = get_authorization_header(request).split()
        if not parties or parties[0].lower() != self.keyword:
            return None
        if len(parties) != 2:
            raise AuthenticationFailed("En-tête Authorization invalide.")

        try:
            token = parties[1].decode()
            user = charger_utilisateur(decoder(token, ACCESS))
        except (TokenInvalide, UnicodeDecodeError) as exc:
            raise AuthenticationFailed(str(exc) or "Token invalide") from exc
        return user, token

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
