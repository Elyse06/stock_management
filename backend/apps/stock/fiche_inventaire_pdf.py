"""Fiche PDF d'un inventaire validé : lieu, comptage article par article, ajustements et signatures
(la personne qui a réalisé l'inventaire, celle qui l'a validé)."""
from collections import Counter

from reportlab.lib.units import cm

from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau
from apps.stock.models import UniteArticle

ETATS = dict(UniteArticle.Etat.choices)


def _lieu(session):
    if session.magasin_id:
        return "Magasin", session.magasin.magasin_nom
    if session.direction_id:
        return "Direction", session.direction.dir_libelle
    if session.site_id:
        return "Agence", session.site.site_nom
    return "Salle", session.salle.nom


def _numero(element):
    return element.get("numero_serie") or (f"unité #{element['unite_id']}" if element.get("unite_id") else "unité")


def ajustements(propositions):
    """Ajustements saisis sur une ligne, en clair : unités ajoutées, retirées, changements d'état."""
    propositions = propositions or {}
    textes = [f"Ajout : {_numero(a)} ({ETATS.get(a.get('etat'), a.get('etat'))})" for a in propositions.get("ajouts", [])]
    textes += [f"Retrait : {_numero(r)} (perdu)" for r in propositions.get("retraits", [])]
    changements = propositions.get("changements_etat", [])
    if changements and all(not c.get("numero_serie") for c in changements):
        # Suivi en quantité : nombre d'unités par nouvel état (« 3 → Mauvais état »).
        textes += [f"{nb} → {ETATS.get(etat, etat)}" for etat, nb in Counter(c.get("etat") for c in changements).items()]
    else:
        textes += [f"{_numero(c)} → {ETATS.get(c.get('etat'), c.get('etat'))}" for c in changements]
    return textes


def generer_fiche_inventaire(session):
    type_lieu, nom_lieu = _lieu(session)
    lignes = list(session.lignes.select_related("article").order_by("article__designation"))
    en_ecart = [ligne for ligne in lignes if ligne.ecart]
    blocs = [
        section("Inventaire"),
        informations([
            ("Référence", session.code_reference), ("Statut", session.get_statut_display()),
            (type_lieu, nom_lieu), ("Articles", session.get_type_articles_display() or "Tous types"),
            ("Réalisé le", date_fr(session.date_creation)), ("Validé le", date_fr(session.date_validation)),
            ("Réalisé par", getattr(session.realise_par, "emp_nom", None)),
            ("Validé par", getattr(session.valide_par, "emp_nom", None)),
        ]),
        section("Synthèse"),
        informations([
            ("Articles comptés", str(len(lignes))), ("Articles en écart", str(len(en_ecart))),
            ("Écart total", nombre(sum(ligne.ecart for ligne in lignes))),
        ]),
        section("Comptage"),
        tableau(
            ["Article", "Théorique", "Physique", "Écart", "Ajustements et commentaire"],
            [
                [
                    [p(ligne.article.designation), p(ligne.article.code_article, PETIT)],
                    nombre(ligne.quantite_theorique), nombre(ligne.quantite_physique),
                    (f"+{nombre(ligne.ecart)}" if ligne.ecart > 0 else nombre(ligne.ecart)),
                    [p(texte) for texte in ajustements(ligne.propositions_series)]
                    + ([p(ligne.commentaire, PETIT)] if ligne.commentaire else []) or [p("—")],
                ]
                for ligne in lignes
            ],
            [5 * cm, 2.3 * cm, 2.3 * cm, 1.6 * cm, 6.2 * cm],
        ),
        signatures([
            ("Réalisé par", getattr(session.realise_par, "emp_nom", None)),
            ("Validé par", getattr(session.valide_par, "emp_nom", None)),
        ]),
    ]
    return fiche_pdf("Fiche d'inventaire", f"Inventaire {session.code_reference}", session.get_statut_display(), blocs)
