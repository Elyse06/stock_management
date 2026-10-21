"""Documents PDF des mouvements de stock.

- Retour d'une unité au stock : **accusé de retour** (signé par l'ancien bénéficiaire et le gestionnaire).
- Transfert d'une unité entre bénéficiaires (retour + nouvelle sortie) : **accusé de retour** pour
  l'ancien bénéficiaire et **accusé de réception** pour le nouveau, sur le même document.
- Tout autre mouvement : **fiche de mouvement** (détail des articles, cadres de signature selon le type).
"""
from reportlab.lib.units import cm

from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau
from apps.stock.models import Mouvement, UniteArticle

_RELATIONS = (
    "article", "fournisseur", "unite", "affectation__employe", "affectation__direction",
    "affectation__salle", "affectation__site",
)


def _details(mouvement):
    return list(mouvement.details.select_related(*_RELATIONS).order_by("pk"))


def _nom(personne):
    return getattr(personne, "emp_nom", "") or ""


def _beneficiaire(detail):
    return detail.affectation.nom if detail.affectation_id else "—"


def _unites(detail):
    """Unités concernées par une ligne : l'unité retournée ou transférée, sinon celles créées (entrée) ou
    attribuées (sortie) par cette ligne."""
    if detail.unite_id:
        return [detail.unite]
    return list(UniteArticle.objects.filter(mouvement_entree=detail) | UniteArticle.objects.filter(mouvement_sortie=detail))


def _motif(mouvement):
    """Motif saisi ; les motifs posés automatiquement (« Transfert - retour temporaire »...) ne sont pas repris."""
    motif = mouvement.motif or ""
    return "—" if not motif or motif.startswith("Transfert - ") or motif == "Retour au stock" else motif


def _ariary(montant):
    if montant is None:
        return "—"
    return f"{montant:,.0f}".replace(",", "\u00a0") + " Ar"


def _article(detail):
    return [p(detail.article.designation), p(detail.article.code_article, PETIT)]


def transfert_associe(mouvement):
    """``(retour, sortie)`` si le mouvement fait partie du transfert d'une unité, sinon ``None``.

    Le retour pointe vers la sortie (``mouvement_lie``) ; pour les transferts antérieurs à ce lien,
    la sortie est retrouvée par son origine (« Transfert unité #N (étape 2/2) »).
    """
    if mouvement.type_mouvement == Mouvement.Type.RETOUR:
        if mouvement.mouvement_lie_id:
            return mouvement, mouvement.mouvement_lie
        if mouvement.origine.startswith("Transfert unité #"):
            numero = mouvement.origine.split("#", 1)[1].split(" ", 1)[0]
            sortie = (Mouvement.objects.filter(type_mouvement=Mouvement.Type.SORTIE, date__gte=mouvement.date,
                                               origine=f"Transfert unité #{numero} (étape 2/2)").order_by("date", "pk").first())
            return (mouvement, sortie) if sortie else None
    if mouvement.type_mouvement == Mouvement.Type.SORTIE:
        retour = Mouvement.objects.filter(mouvement_lie=mouvement).first()
        if retour:
            return retour, mouvement
    return None


def _lignes_unites(details_retour, details_sortie=None):
    """Une ligne par unité : article, n° de série, n° d'immobilisation, état, bénéficiaires."""
    sorties = {d.unite_id: d for d in details_sortie or [] if d.unite_id}
    lignes = []
    for detail in details_retour:
        for unite in _unites(detail) or [None]:
            ligne = [
                _article(detail),
                (unite.numero_de_serie if unite else None) or (f"#{unite.unite_id}" if unite else "—"),
                (unite.numero_immobilisation if unite else "") or "—",
                unite.get_etat_display() if unite else "—",
                _beneficiaire(detail),
            ]
            if details_sortie is not None:
                sortie = sorties.get(getattr(unite, "unite_id", None)) or (details_sortie[0] if len(details_sortie) == 1 else None)
                ligne.append(_beneficiaire(sortie) if sortie else "—")
            lignes.append(ligne)
    return lignes


def _accuse_retour(mouvement):
    details = _details(mouvement)
    ancien = ", ".join(sorted({_beneficiaire(d) for d in details})) or "—"
    magasin = mouvement.magasin_destination.magasin_nom if mouvement.magasin_destination else "—"
    blocs = [
        section("Retour"),
        informations([("Date", date_fr(mouvement.date)), ("Magasin de réception", magasin),
                      ("Motif", _motif(mouvement)), ("Réceptionné par", _nom(mouvement.realise_par) or "—")]),
        section("Matériel retourné"),
        tableau(["Article", "N° de série", "N° immo.", "État", "Ancien bénéficiaire"],
                _lignes_unites(details), [5 * cm, 3.2 * cm, 3.2 * cm, 2.2 * cm, 3.8 * cm]),
        section("Accusé de retour"),
        p(f"Le matériel ci-dessus, détenu par {ancien}, a été restitué au magasin « {magasin} » "
          "et réceptionné par le gestionnaire du stock."),
        signatures([("L'ancien bénéficiaire", ancien if ancien != "—" else ""),
                    ("Le gestionnaire du stock", _nom(mouvement.realise_par))]),
    ]
    return fiche_pdf("Accusé de retour de matériel", f"Mouvement n°{mouvement.pk}", "Retour au stock", blocs)


def _accuse_transfert(retour, sortie):
    details_retour, details_sortie = _details(retour), _details(sortie)
    ancien = ", ".join(sorted({_beneficiaire(d) for d in details_retour})) or "—"
    nouveau = ", ".join(sorted({_beneficiaire(d) for d in details_sortie})) or "—"
    gestionnaire = _nom(retour.realise_par or sortie.realise_par)
    magasin = retour.magasin_destination.magasin_nom if retour.magasin_destination else "—"
    blocs = [
        section("Transfert"),
        informations([("Date", date_fr(sortie.date)), ("Magasin de passage", magasin),
                      ("Motif", _motif(retour)), ("Effectué par", gestionnaire or "—"),
                      ("Ancien bénéficiaire", ancien), ("Nouveau bénéficiaire", nouveau)]),
        section("Matériel transféré"),
        tableau(["Article", "N° de série", "N° immo.", "État", "Ancien bénéficiaire", "Nouveau bénéficiaire"],
                _lignes_unites(details_retour, details_sortie),
                [4 * cm, 2.6 * cm, 2.6 * cm, 1.8 * cm, 3.2 * cm, 3.2 * cm]),
        section("1. Accusé de retour"),
        p(f"{ancien} a restitué le matériel ci-dessus au gestionnaire du stock."),
        signatures([("L'ancien bénéficiaire", ancien if ancien != "—" else ""), ("Le gestionnaire du stock", gestionnaire)]),
        section("2. Accusé de réception"),
        p(f"{nouveau} reconnaît avoir reçu le matériel ci-dessus en bon état."),
        signatures([("Le nouveau bénéficiaire", nouveau if nouveau != "—" else ""), ("Le gestionnaire du stock", gestionnaire)]),
    ]
    return fiche_pdf("Transfert de matériel", f"Mouvements n°{retour.pk} et n°{sortie.pk}",
                     "Accusé de retour et de réception", blocs)


def _fiche_mouvement(mouvement):
    details = _details(mouvement)
    entree = mouvement.type_mouvement == Mouvement.Type.ENTREE
    lignes = []
    for detail in details:
        series = ", ".join(sorted(u.numero_de_serie or f"#{u.unite_id}" for u in _unites(detail))) or "—"
        tiers = (detail.fournisseur.nom if detail.fournisseur_id else "—") if entree else _beneficiaire(detail)
        lignes.append([_article(detail), nombre(detail.quantite), series, tiers]
                      + ([_ariary(detail.prix_achat)] if entree else []))
    entete = ["Article", "Quantité", "N° de série", "Fournisseur" if entree else "Bénéficiaire"] + (["Prix d'achat"] if entree else [])
    largeurs = [5 * cm, 2.1 * cm, 3.9 * cm, 3.6 * cm, 2.8 * cm] if entree else [6 * cm, 2.1 * cm, 4.9 * cm, 4.4 * cm]
    gestionnaire = ("Le gestionnaire du stock", _nom(mouvement.realise_par))
    cadres = {
        Mouvement.Type.ENTREE: [gestionnaire, ("Le livreur / fournisseur", "")],
        Mouvement.Type.SORTIE: [gestionnaire, ("Le bénéficiaire", ", ".join(sorted({_beneficiaire(d) for d in details})))],
        Mouvement.Type.TRANSFERT: [gestionnaire, ("Magasin de départ", getattr(mouvement.magasin_source, "magasin_nom", "")),
                                   ("Magasin d'arrivée", getattr(mouvement.magasin_destination, "magasin_nom", ""))],
    }.get(mouvement.type_mouvement, [gestionnaire])
    blocs = [
        section("Mouvement"),
        informations([
            ("Type", mouvement.get_type_mouvement_display()), ("Date", date_fr(mouvement.date)),
            ("Magasin source", getattr(mouvement.magasin_source, "magasin_nom", None) or "—"),
            ("Magasin destination", getattr(mouvement.magasin_destination, "magasin_nom", None) or "—"),
            ("Origine", mouvement.origine or "—"), ("Motif", mouvement.motif or "—"),
            ("Réalisé par", _nom(mouvement.realise_par) or "—"),
            ("Quantité totale", nombre(sum(d.quantite for d in details))),
        ]),
        section("Articles"),
        tableau(entete, lignes or [["Aucun article", "", "", ""] + ([""] if entree else [])], largeurs),
        signatures(cadres),
    ]
    return fiche_pdf("Fiche de mouvement de stock", f"Mouvement n°{mouvement.pk}", mouvement.get_type_mouvement_display(), blocs)


def generer_document_mouvement(mouvement):
    """Accusé de retour, accusé de transfert ou fiche de mouvement selon la nature du mouvement."""
    transfert = transfert_associe(mouvement)
    if transfert:
        return _accuse_transfert(*transfert)
    if mouvement.type_mouvement == Mouvement.Type.RETOUR and any(d.unite_id or d.affectation_id for d in mouvement.details.all()):
        return _accuse_retour(mouvement)
    return _fiche_mouvement(mouvement)


def nom_fichier_mouvement(mouvement):
    transfert = transfert_associe(mouvement)
    if transfert:
        return f"accuse_transfert_{transfert[0].pk}_{transfert[1].pk}.pdf"
    if mouvement.type_mouvement == Mouvement.Type.RETOUR:
        return f"accuse_retour_{mouvement.pk}.pdf"
    return f"mouvement_{mouvement.pk}.pdf"
