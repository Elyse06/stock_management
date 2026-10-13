"""Socle des outils de l'assistant.

Chaque outil :
- déclare les droits requis (AU MOINS UNE action, comme l'API) : un outil non
  autorisé n'est même pas proposé au modèle, et il est revérifié à l'exécution ;
- reçoit des arguments NETTOYÉS (types, bornes, valeurs permises) : ils viennent
  du modèle, donc potentiellement d'une injection dans les données ;
- est en LECTURE SEULE : l'assistant ne modifie jamais rien ;
- renvoie un résumé compact pour le modèle, et éventuellement un tableau et des
  liens affichés tels quels à l'utilisateur (ces données-là ne passent pas par
  le modèle, elles ne peuvent donc pas être déformées).
"""
from dataclasses import dataclass, field

from apps.common.employees import get_request_employee
from apps.common.permissions import get_user_actions

from ..carte import chemin_accessible

LIGNES_TABLEAU_MAX = 8
TEXTE_MAX = 200


class ErreurOutil(Exception):
    """Erreur prévue (paramètre invalide, élément introuvable) : message transmis au modèle."""


@dataclass
class Contexte:
    request: object
    actions: frozenset = field(init=False)
    _employe: object = field(init=False, default=None)
    _employe_charge: bool = field(init=False, default=False)

    def __post_init__(self):
        self.actions = frozenset(get_user_actions(self.request.user))

    @property
    def employe(self):
        if not self._employe_charge:
            self._employe, self._employe_charge = get_request_employee(self.request), True
        return self._employe

    def peut(self, *actions):
        return not actions or bool(self.actions & set(actions))


@dataclass
class Resultat:
    pour_ia: dict
    tableau: dict | None = None
    liens: list = field(default_factory=list)


@dataclass
class Outil:
    nom: str
    description: str
    parametres: dict
    executer: object  # (contexte, **arguments) -> Resultat
    actions: tuple = ()

    def autorise(self, contexte):
        return contexte.peut(*self.actions)

    def schema(self):
        return {"type": "function", "function": {
            "name": self.nom, "description": self.description,
            "parameters": {"type": "object", "properties": self.parametres, "required": []},
        }}

    def appeler(self, contexte, arguments):
        if not self.autorise(contexte):
            raise ErreurOutil("Vous n'avez pas les droits nécessaires pour ces données.")
        return self.executer(contexte, **nettoyer_arguments(self.parametres, arguments))


def nettoyer_arguments(parametres, arguments):
    """Ne garde que les paramètres déclarés, convertis et bornés ; ignore le reste."""
    propres = {}
    for nom, regle in parametres.items():
        if not isinstance(arguments, dict) or arguments.get(nom) in (None, ""):
            continue
        valeur = arguments[nom]
        try:
            if regle["type"] == "integer":
                valeur = min(max(int(valeur), regle.get("minimum", 0)), regle.get("maximum", 10**9))
            elif regle["type"] == "boolean":
                valeur = valeur if isinstance(valeur, bool) else str(valeur).lower() in ("true", "1", "oui")
            else:
                valeur = " ".join(str(valeur).split())[:TEXTE_MAX]
        except (TypeError, ValueError):
            continue
        if "enum" in regle and valeur not in regle["enum"]:
            continue
        propres[nom] = valeur
    return propres


def texte(nom_description, **extra):
    return {"type": "string", "description": nom_description, **extra}


def entier(description, minimum=1, maximum=50):
    return {"type": "integer", "description": description, "minimum": minimum, "maximum": maximum}


def tableau(titre, colonnes, lignes, total=None, lien=None):
    """Tableau affiché à l'utilisateur (au plus 8 lignes, avec lien « Voir tout »)."""
    return {
        "titre": titre,
        "colonnes": colonnes,
        "lignes": [[("" if v is None else str(v)) for v in ligne] for ligne in lignes[:LIGNES_TABLEAU_MAX]],
        "total": len(lignes) if total is None else total,
        "lien": lien,
    }


def lien(contexte, libelle, chemin):
    """Lien de navigation, proposé seulement si la page est accessible à l'utilisateur."""
    return [{"libelle": libelle, "chemin": chemin}] if chemin_accessible(chemin, contexte.actions) else []


def lien_unique(contexte, libelle, chemin):
    liens = lien(contexte, libelle, chemin)
    return liens[0] if liens else None
