from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from .tokens import ACCESS, TokenInvalide, charger_utilisateur, decoder

# Seules adresses accessibles tant que le mot de passe temporaire n'a pas été changé.
ADRESSES_AVANT_CHANGEMENT = {"/api/auth/me/", "/api/auth/changer-mot-de-passe/"}


class MotDePasseAChanger(PermissionDenied):
    """Réponse 403 avec un code reconnaissable par l'interface."""

    def __init__(self):
        super().__init__({"detail": "Vous devez changer votre mot de passe temporaire avant de continuer.",
                          "code": "mot_de_passe_a_changer"})


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
        # Mot de passe temporaire : tout est refusé, sauf le profil et le changement de mot de passe.
        # Le contrôle est fait ici, côté serveur, pour qu'il ne dépende pas de l'interface.
        if user.mdp_a_changer and request.path not in ADRESSES_AVANT_CHANGEMENT:
            raise MotDePasseAChanger()
        return user, token

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
