from rest_framework.throttling import SimpleRateThrottle


class _ParIP(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class _ParUtilisateur(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        user = getattr(request, "user", None)
        ident = user.pk if getattr(user, "is_authenticated", False) else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginThrottle(_ParIP):
    scope = "login"


class RefreshThrottle(_ParIP):
    scope = "refresh"


class AIThrottle(_ParUtilisateur):
    scope = "ai"


class ImportThrottle(_ParUtilisateur):
    scope = "import"
