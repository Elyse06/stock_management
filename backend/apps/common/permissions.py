from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.utilisateur.models import Autoriser

_CACHE_ATTR = "_actions_cache"


def get_user_actions(user) -> frozenset:
    if user is None or not getattr(user, "is_authenticated", False):
        return frozenset()
    cached = getattr(user, _CACHE_ATTR, None)
    if cached is not None:
        return cached
    user_id = getattr(user, "pk", None)
    if user_id is None:
        return frozenset()
    actions = frozenset(
        Autoriser.objects.filter(autoriser_utilisateur_id_id=user_id)
        .values_list("autoriser_action_id_id", flat=True)
    )
    setattr(user, _CACHE_ATTR, actions)
    return actions


def invalidate_user_actions(user):
    if hasattr(user, _CACHE_ATTR):
        delattr(user, _CACHE_ATTR)


def user_has_any_action(user, *actions) -> bool:
    return bool(get_user_actions(user).intersection(actions))


def user_has_all_actions(user, *actions) -> bool:
    return get_user_actions(user).issuperset(actions)


class HasAction(BasePermission):
    actions_autorisees: tuple = ()
    message = "Vous n'avez pas les droits nécessaires pour cette opération."

    def has_permission(self, request, view):
        return user_has_any_action(request.user, *self.actions_autorisees)

    @classmethod
    def for_actions(cls, *actions):
        return type(f"HasAction_{'_'.join(actions)}", (cls,), {"actions_autorisees": actions})


class HasActionByMethod(BasePermission):
    actions_par_methode: dict = {}  # noqa: RUF012
    message = HasAction.message

    def has_permission(self, request, view):
        actions = self.actions_par_methode.get(
            request.method, self.actions_par_methode.get("*", ())
        )
        return user_has_any_action(request.user, *actions)

    @classmethod
    def for_methods(cls, **actions_par_methode):
        return type(
            "HasActionByMethod_" + "_".join(actions_par_methode),
            (cls,),
            {"actions_par_methode": actions_par_methode},
        )


def lecture_ecriture(lecture, ecriture):
    """Raccourci : actions de lecture (GET/HEAD/OPTIONS) et d'écriture (le reste).

    >>> permission_classes = [lecture_ecriture(lecture=(CAT_LIRE,), ecriture=(CAT_GERE,))]
    """
    lecture = tuple(lecture)
    ecriture = tuple(ecriture)
    par_methode = {methode: lecture for methode in SAFE_METHODS}
    par_methode["*"] = ecriture
    return HasActionByMethod.for_methods(**par_methode)


class LectureAuthentifieeEcritureAction(BasePermission):
    actions_ecriture: tuple = ()
    message = HasAction.message

    def has_permission(self, request, view):
        if not getattr(request.user, "is_authenticated", False):
            return False
        if request.method in SAFE_METHODS:
            return True
        return user_has_any_action(request.user, *self.actions_ecriture)

    @classmethod
    def for_actions(cls, *actions):
        return type(
            f"LectureAuthentifiee_{'_'.join(actions)}", (cls,), {"actions_ecriture": actions}
        )
