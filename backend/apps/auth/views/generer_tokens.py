import datetime

import jwt
from django.conf import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

def generate_tokens(user):
    now = datetime.datetime.utcnow()  # noqa: DTZ003
    
    access_payload = {
        "user_id": user.utilisateur_id,
        "email": user.utilisateur_mail,
        "exp": now + datetime.timedelta(minutes=30),
        "iat": now,
        "type": "access",
    }
    
    refresh_payload = {
        "user_id": user.utilisateur_id,
        "exp": now + datetime.timedelta(days=7),
        "iat": now,
        "type": "refresh",
    }
    
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return access_token, refresh_token