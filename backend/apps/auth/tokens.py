import hashlib
import hmac

import jwt
from django.conf import settings
from django.utils import timezone

ACCESS = "access"
REFRESH = "refresh"
_CLAIMS_OBLIGATOIRES = ["exp", "iat", "iss", "type", "user_id", "pwv"]


class TokenInvalide(Exception):  # noqa: N818
    pass


def _config():
    return settings.JWT


def empreinte_mot_de_passe(user) -> str:
    cle = _config()["SIGNING_KEY"].encode()
    return hmac.new(cle, (user.utilisateur_mdp or "").encode(), hashlib.sha256).hexdigest()[:16]


def _encoder(user, type_jeton, duree, **extra):
    config = _config()
    maintenant = timezone.now()
    payload = {
        "user_id": user.utilisateur_id,
        "type": type_jeton,
        "iat": maintenant,
        "exp": maintenant + duree,
        "iss": config["ISSUER"],
        "pwv": empreinte_mot_de_passe(user),
        **extra,
    }
    return jwt.encode(payload, config["SIGNING_KEY"], algorithm=config["ALGORITHM"])


def generer_access(user) -> str:
    return _encoder(user, ACCESS, _config()["ACCESS_LIFETIME"], email=user.utilisateur_mail)


def generer_tokens(user) -> tuple[str, str]:
    return generer_access(user), _encoder(user, REFRESH, _config()["REFRESH_LIFETIME"])


def decoder(token: str, type_attendu: str) -> dict:
    config = _config()
    try:
        payload = jwt.decode(
            token,
            config["SIGNING_KEY"],
            algorithms=[config["ALGORITHM"]],
            issuer=config["ISSUER"],
            options={"require": _CLAIMS_OBLIGATOIRES},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenInvalide("Token expiré") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenInvalide("Token invalide") from exc
    if payload.get("type") != type_attendu:
        raise TokenInvalide("Token invalide")
    return payload


def charger_utilisateur(payload):
    from apps.utilisateur.models import Utilisateur

    user = Utilisateur.objects.filter(utilisateur_id=payload["user_id"]).first()
    if user is None:
        raise TokenInvalide("Utilisateur inexistant")
    if not hmac.compare_digest(str(payload["pwv"]), empreinte_mot_de_passe(user)):
        raise TokenInvalide("Token révoqué")
    return user
