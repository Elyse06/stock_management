"""Carte de l'application : pages et guides pas à pas, filtrés selon les droits.

Les pages reprennent ``frontend/src/app/router/navigation.js`` (mêmes chemins,
libellés et droits) : toute modification du menu doit être reportée ici.
``actions`` : il faut AU MOINS UNE de ces actions (vide = tout utilisateur).
"""
from apps.common import actions as a

PAGES = [
    {"chemin": "/", "titre": "Tableau de bord", "actions": [],
     "description": "Indicateurs clés, alertes de stock, flux mensuels, répartitions et articles dormants."},
    {"chemin": "/utilisateurs", "titre": "Utilisateurs & Rôles", "actions": [a.USR_GERE],
     "description": "Comptes, permissions, rattachement d'un compte à sa fiche employé."},
    {"chemin": "/employes", "titre": "Employés", "actions": [],
     "description": "Annuaire des employés, création, import Excel."},
    {"chemin": "/employes/services", "titre": "Services", "actions": [], "description": "Services de chaque direction."},
    {"chemin": "/employes/directions", "titre": "Directions", "actions": [], "description": "Directions de l'organisation."},
    {"chemin": "/employes/sites", "titre": "Sites", "actions": [], "description": "Siège et agences."},
    {"chemin": "/catalogue/articles", "titre": "Articles", "actions": [a.CAT_LIRE],
     "description": "Catalogue des articles avec leur stock ; fiche détaillée de chaque article."},
    {"chemin": "/catalogue/categories", "titre": "Catégories", "actions": [a.CAT_GERE],
     "description": "Codes et descriptions des catégories d'articles."},
    {"chemin": "/catalogue/fournisseurs", "titre": "Fournisseurs", "actions": [a.CAT_GERE],
     "description": "Fournisseurs et leurs coordonnées."},
    {"chemin": "/inventaire/mouvements", "titre": "Mouvements", "actions": [a.MOV_LIRE],
     "description": "Entrées, sorties, transferts, ajustements et retours de stock."},
    {"chemin": "/inventaire/sessions", "titre": "Inventaires", "actions": [a.INV_LIRE],
     "description": "Sessions d'inventaire, leur détail et leur validation."},
    {"chemin": "/inventaire/unites", "titre": "Unités attribuées", "actions": [a.CAT_LIRE, a.INV_LIRE],
     "description": "Bénéficiaires et leur nombre d'articles ; détail des unités du bénéficiaire choisi : "
                    "retour, transfert, étiquette QR."},
    {"chemin": "/magasins", "titre": "Magasins", "actions": [a.INV_GERE], "description": "Magasins de stockage."},
    {"chemin": "/salles", "titre": "Salles", "actions": [a.CAT_LIRE, a.INV_GERE], "description": "Salles du siège."},
    {"chemin": "/import/immobilisations", "titre": "Import immobilisations", "actions": [a.CAT_GERE],
     "description": "Import Excel des immobilisations avec aperçu avant confirmation."},
    {"chemin": "/import/fournitures", "titre": "Import fournitures", "actions": [a.CAT_GERE],
     "description": "Import Excel des fournitures avec aperçu avant confirmation."},
    {"chemin": "/commandes", "titre": "Commandes", "actions": [a.COM_DEM, a.COM_VAL],
     "description": "Demandes de matériel : création, pré-validation, validation finale."},
    {"chemin": "/historique/globale", "titre": "Historique global", "actions": [a.MOV_LIRE],
     "description": "Tous les mouvements filtrés par période, magasin, type ou article."},
    {"chemin": "/historique/localisation", "titre": "Historique par localisation", "actions": [a.MOV_LIRE],
     "description": "Stock d'un magasin, d'une direction, d'un site ou d'une salle à une date donnée, "
                    "et résumé des unités en stock par état."},
    {"chemin": "/historique/article", "titre": "Historique d'un article", "actions": [a.MOV_LIRE],
     "description": "Fiche de stock d'un article (mouvements, stock cumulé) et export Excel."},
]

GUIDES = [
    {"tache": "Faire une demande de matériel (commande)", "chemin": "/commandes", "actions": [a.COM_DEM], "etapes": [
        "Ouvrir Commandes puis cliquer sur « Nouvelle demande ».",
        "Choisir l'article et la quantité ; ajouter si besoin des bénéficiaires dans la colonne Attribution.",
        "Cliquer sur « Voir le récapitulatif », choisir l'objet puis « Enregistrer la commande ».",
        "La demande est pré-validée par le chef de service puis validée par le gestionnaire de stock.",
    ]},
    {"tache": "Pré-valider ou valider une commande", "chemin": "/commandes", "actions": [a.COM_VAL], "etapes": [
        "Ouvrir Commandes et cliquer sur l'icône de validation de la commande.",
        "Statuer sur chaque attribution (Valider ou Refuser, quantité ajustable).",
        "Validation finale : choisir le magasin source et, pour les articles à numéro de série, cocher les unités.",
        "Cliquer sur « Transmettre (pré-valider) » ou « Valider la sortie », ou « Rejeter » avec un commentaire.",
    ]},
    {"tache": "Enregistrer une entrée de stock ou un transfert", "chemin": "/inventaire/mouvements",
     "actions": [a.INV_GERE], "etapes": [
        "Ouvrir Inventaire > Mouvements puis « Nouveau mouvement ».",
        "Choisir « Entrée de stock » ou « Transfert entre magasins » et le(s) magasin(s).",
        "Ajouter les articles : quantité, ou numéros de série (touche Entrée ou « Saisie rapide »).",
        "Cliquer sur « Enregistrer ».",
    ]},
    {"tache": "Réaliser un inventaire", "chemin": "/inventaire/sessions/realisation",
     "actions": [a.INV_GERE], "etapes": [
        "Ouvrir Inventaire > Inventaires puis « Réalisation de l'inventaire ».",
        "Choisir le lieu : magasin, agence, ou direction / salle du siège.",
        "Saisir la quantité physique de chaque article ; les écarts s'affichent.",
        "Pour les articles à numéro de série en écart, renseigner l'ajustement, puis « Enregistrer l'inventaire ».",
        "Un utilisateur ayant le droit de validation valide ensuite la session depuis Inventaires.",
    ]},
    {"tache": "Retourner ou transférer une unité attribuée", "chemin": "/inventaire/unites",
     "actions": [a.INV_GERE], "etapes": [
        "Ouvrir Inventaire > Unités attribuées ; filtrer si besoin (bénéficiaire, article, n° de série, état).",
        "Cliquer sur le bénéficiaire dans le tableau de gauche : ses unités s'affichent à droite.",
        "Cliquer sur « Retour » pour remettre l'unité en magasin, ou « Transfert » pour changer de bénéficiaire.",
        "Le bouton « Étiquette » imprime l'étiquette QR de l'unité.",
    ]},
    {"tache": "Importer des immobilisations ou des fournitures", "chemin": "/import/immobilisations",
     "actions": [a.CAT_GERE], "etapes": [
        "Ouvrir Inventaire > Import immobilisations (ou Import fournitures).",
        "Déposer le fichier Excel puis cliquer sur « Prévisualiser » pour contrôler les lignes.",
        "Corriger le fichier si besoin, puis confirmer l'import.",
    ]},
    {"tache": "Consulter l'historique ou exporter la fiche d'un article", "chemin": "/historique/article",
     "actions": [a.MOV_LIRE], "etapes": [
        "Ouvrir Historique > Article et choisir l'article.",
        "Filtrer par site ou période si besoin ; « Export Excel » télécharge la fiche.",
    ]},
    {"tache": "Créer un compte utilisateur", "chemin": "/utilisateurs", "actions": [a.USR_GERE], "etapes": [
        "Ouvrir Utilisateurs & Rôles puis ajouter un utilisateur.",
        "Saisir l'e-mail et le mot de passe, rattacher l'employé, choisir un profil ou cocher les permissions.",
        "Sans employé rattaché, l'utilisateur ne voit pas ses commandes.",
    ]},
    {"tache": "Ajouter un employé", "chemin": "/employes", "actions": [a.USR_GERE], "etapes": [
        "Ouvrir Employés puis « Nouvel Employé » (ou « Importer » pour un fichier Excel).",
        "Renseigner nom, matricule et fonction, puis le site, la direction et le service.",
    ]},
]


def _autorise(element, actions_utilisateur):
    return not element["actions"] or bool(set(element["actions"]) & actions_utilisateur)


def pages_accessibles(actions_utilisateur):
    return [p for p in PAGES if _autorise(p, actions_utilisateur)]


def guides_accessibles(actions_utilisateur):
    return [g for g in GUIDES if _autorise(g, actions_utilisateur)]


# Pages hors menu (comme EXTRA_ROUTE_ACTIONS du frontend) ; les fiches d'article
# (/catalogue/articles/<code>) héritent des droits de la liste.
PAGES_HORS_MENU = {"/inventaire/sessions/realisation": {"actions": [a.INV_GERE]}}


def chemin_accessible(chemin, actions_utilisateur):
    """Vrai si la page (sans paramètres) est accessible : un lien proposé doit toujours l'être."""
    base = chemin.split("?")[0]
    pages = {p["chemin"]: p for p in PAGES} | PAGES_HORS_MENU
    page = pages.get(base) or pages.get(base.rsplit("/", 1)[0])
    return page is not None and _autorise(page, actions_utilisateur)
