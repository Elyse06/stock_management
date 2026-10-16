"""Outils de suivi : écarts d'inventaire, délais des commandes, stock d'un lieu, détail d'une commande,
demandes de retour ou de transfert, équipements de l'utilisateur. Mêmes droits que l'application."""
from datetime import date, timedelta

from django.utils import timezone

from apps.catalogue.models import Article
from apps.commande.access import filtrer_commandes_visibles
from apps.commande.models import Commande
from apps.common import actions as a
from apps.common.dates import debut_de_journee
from apps.common.localisation import filtre_direction, filtre_salle, filtre_site
from apps.common.stock import stocks_articles_beneficiaire, stocks_articles_magasin
from apps.employee.models import Direction, Site
from apps.stock.models import DemandeUnite, InventaireSession, Magasin, Salle
from apps.stock.services.demandes_unites import unites_visibles

from .analyses import nombre
from .base import ErreurOutil, Outil, Resultat, entier, lien_unique, tableau, texte
from .periodes import parametres_periode, plage
from .texte import correspond, filtrer_tolerant, mots_recherche


def _jour(valeur):
    return f"{timezone.localtime(valeur):%d/%m/%Y}" if valeur else "—"


def _lieu_inventaire(s):
    return (s.magasin and s.magasin.magasin_nom) or (s.direction and s.direction.dir_libelle) \
        or (s.salle and s.salle.nom) or (s.site and s.site.site_nom) or "—"


def _ecarts_inventaire(contexte, reference=None, lieu=None):
    sessions = InventaireSession.objects.select_related("magasin", "direction", "site", "salle").order_by("-date_creation")
    if reference:
        sessions = sessions.filter(code_reference__iexact=reference)
    if lieu:
        sessions = filtrer_tolerant(sessions, lieu, ("magasin__magasin_nom", "direction__dir_libelle", "site__site_nom", "salle__nom"))
    session = sessions.filter(statut=InventaireSession.Statut.VALIDE).first() if not reference else None
    session = session or sessions.first()
    if session is None:
        raise ErreurOutil("Aucune session d'inventaire ne correspond.")
    lignes = list(session.lignes.select_related("article").order_by("ecart"))
    ecarts = [li for li in lignes if li.ecart]
    return Resultat(
        pour_ia={"reference": session.code_reference, "date": _jour(session.date_creation), "lieu": _lieu_inventaire(session),
                 "statut": session.get_statut_display(), "articles_comptes": len(lignes), "articles_en_ecart": len(ecarts),
                 "ecarts": [{"article": li.article.designation, "theorique": nombre(li.quantite_theorique),
                             "physique": nombre(li.quantite_physique), "ecart": nombre(li.ecart), "commentaire": li.commentaire or ""}
                            for li in ecarts]},
        tableau=tableau(f"Écarts de l'inventaire {session.code_reference} ({_lieu_inventaire(session)})",
                        ["Article", "Théorique", "Physique", "Écart"],
                        [[li.article.designation, nombre(li.quantite_theorique), nombre(li.quantite_physique), nombre(li.ecart)] for li in ecarts],
                        len(ecarts), lien_unique(contexte, "Voir les inventaires", "/inventaire/sessions")),
    )


def _delais_commandes(contexte, periode=None, date_debut=None, date_fin=None):
    debut, fin, libelle = plage(periode, date_debut, date_fin, defaut="12_derniers_mois")
    visibles = filtrer_commandes_visibles(Commande.objects.select_related("employe_demandeur"), contexte.request)
    traitees = visibles.filter(date_commande__gte=debut, date_commande__lt=fin, statut__in=("VALIDEE", "REJETEE"),
                               date_traitement__isnull=False)
    delais = [(c.date_traitement - c.date_commande).total_seconds() / 86400 for c in traitees]
    maintenant = timezone.now()
    attente = list(visibles.filter(statut__in=("EN_ATTENTE", "EN_COURS")).order_by("date_commande")[:10])
    return Resultat(
        pour_ia={"periode": libelle, "commandes_traitees": len(delais),
                 "delai_moyen_jours": round(sum(delais) / len(delais), 1) if delais else None,
                 "delai_maximum_jours": round(max(delais), 1) if delais else None,
                 "plus_anciennes_en_attente": [{"numero": c.commande_id, "demandeur": c.employe_demandeur.emp_nom if c.employe_demandeur else None,
                                                "statut": c.get_statut_display(), "attente_jours": (maintenant - c.date_commande).days}
                                               for c in attente]},
        tableau=tableau("Commandes en attente (les plus anciennes)", ["N°", "Demandeur", "Statut", "En attente depuis"],
                        [[c.commande_id, c.employe_demandeur.emp_nom if c.employe_demandeur else "—", c.get_statut_display(),
                          f"{(maintenant - c.date_commande).days} j"] for c in attente],
                        lien=lien_unique(contexte, "Voir les commandes", "/commandes")) if attente else None,
    )


LIEUX = [(Magasin, ("magasin_nom",), None, "magasin"), (Direction, ("dir_libelle", "dir_description"), filtre_direction, "direction"),
         (Site, ("site_nom",), filtre_site, "site"), (Salle, ("nom",), filtre_salle, "salle")]


def _stock_lieu(contexte, lieu=None, date=None):
    if not lieu:
        raise ErreurOutil("Précisez le magasin, la direction, le site ou la salle.")
    mots = mots_recherche(lieu)
    candidats = [(objet, modele, filtre, nature) for modele, champs, filtre, nature in LIEUX
                 for objet in modele.objects.all() if correspond(" ".join(str(getattr(objet, c) or "") for c in champs), mots)]
    if not candidats:
        raise ErreurOutil(f"Aucun magasin, direction, site ou salle ne correspond à « {lieu} ».")
    if len(candidats) > 1:
        return Resultat(pour_ia={"ambigu": True, "consigne": "Plusieurs lieux correspondent : demander lequel.",
                                 "candidats": [f"{n} : {o}" for o, _, _, n in candidats[:6]]},
                        choix=[{"libelle": f"{n.capitalize()} : {o}", "message": f"Quel est le stock de {n} « {o} » ?"} for o, _, _, n in candidats[:6]])
    objet, _, filtre, nature = candidats[0]
    try:
        jour = date_fn(date) if date else timezone.localdate()
    except ValueError as exc:
        raise ErreurOutil("Date attendue au format AAAA-MM-JJ.") from exc
    limite = debut_de_journee(jour + timedelta(days=1))
    stocks = stocks_articles_magasin(objet.pk, date_max=limite) if filtre is None else stocks_articles_beneficiaire(filtre(objet.pk), date_max=limite)
    noms = dict(Article.objects.filter(code_article__in=stocks).values_list("code_article", "designation"))
    lignes = sorted(((noms.get(code, code), q) for code, q in stocks.items() if q > 0), key=lambda x: x[0])
    return Resultat(
        pour_ia={"lieu": f"{nature} {objet}", "date": f"{jour:%d/%m/%Y}", "articles": [{"article": n, "stock": nombre(q)} for n, q in lignes]},
        tableau=tableau(f"Stock de {nature} « {objet} » au {jour:%d/%m/%Y}", ["Article", "Stock"], [[n, nombre(q)] for n, q in lignes],
                        lien=lien_unique(contexte, "Ouvrir l'historique par localisation", "/historique/localisation")),
    )


def date_fn(valeur):
    return date.fromisoformat(valeur)


def _detail_commande(contexte, numero=None):
    commande = (filtrer_commandes_visibles(Commande.objects.select_related("employe_demandeur", "employe_traitant"), contexte.request)
                .filter(pk=numero).first() if numero else None)
    if commande is None:
        raise ErreurOutil(f"Commande n°{numero} introuvable parmi celles que vous pouvez consulter.")
    details = commande.details.select_related("article").prefetch_related("attributions__affectation__employe", "attributions__affectation__direction")
    lignes = [{"article": d.article.designation, "quantite": nombre(d.quantite),
               "beneficiaires": [f"{at.affectation.nom} ({nombre(at.quantite_demandee or at.quantite)}, {at.get_statut_display().lower()})"
                                 for at in d.attributions.all()]} for d in details]
    return Resultat(
        pour_ia={"numero": commande.commande_id, "date": _jour(commande.date_commande), "objet": commande.objet, "statut": commande.get_statut_display(),
                 "demandeur": commande.employe_demandeur.emp_nom if commande.employe_demandeur else None,
                 "traitee_par": commande.employe_traitant.emp_nom if commande.employe_traitant else None,
                 "date_traitement": _jour(commande.date_traitement), "commentaire": commande.commentaire_agent or "", "articles": lignes},
        tableau=tableau(f"Commande n°{commande.commande_id} ({commande.get_statut_display()})", ["Article", "Quantité", "Bénéficiaires"],
                        [[li["article"], li["quantite"], ", ".join(li["beneficiaires"]) or "—"] for li in lignes],
                        lien=lien_unique(contexte, "Voir les commandes", "/commandes")),
    )


def _demandes_unites(contexte, statut=None, type_demande=None, seulement_les_miennes=False, limite=15):
    demandes = DemandeUnite.objects.select_related("unite__article", "demandeur", "nouvelle_affectation__employe",
                                                   "nouvelle_affectation__direction", "nouvelle_affectation__salle", "nouvelle_affectation__site")
    if seulement_les_miennes or not contexte.peut(a.INV_GERE):
        demandes = demandes.filter(demandeur=contexte.employe)
    if statut:
        demandes = demandes.filter(statut=statut)
    if type_demande:
        demandes = demandes.filter(type_demande=type_demande)
    total = demandes.count()
    lignes = list(demandes.order_by("-date_demande")[:limite])

    def libelle(d):
        return "Retour en stock" if d.type_demande == "RETOUR" else f"Transfert vers {d.nouvelle_affectation.nom if d.nouvelle_affectation else '—'}"
    return Resultat(
        pour_ia={"total": total, "demandes": [
            {"numero": d.pk, "date": _jour(d.date_demande), "demande": libelle(d), "equipement": d.unite.article.designation,
             "numero_serie": d.unite.numero_de_serie, "demandeur": d.demandeur.emp_nom if d.demandeur else None,
             "statut": d.get_statut_display(), "motif": d.motif, "reponse": d.commentaire_traitement} for d in lignes]},
        tableau=tableau("Demandes de retour et de transfert", ["N°", "Demande", "Équipement", "Statut"],
                        [[d.pk, libelle(d), f"{d.unite.article.designation} {d.unite.numero_de_serie or ''}".strip(), d.get_statut_display()]
                         for d in lignes], total,
                        lien_unique(contexte, "Voir les demandes", "/inventaire/unites?onglet=demandes")
                        or lien_unique(contexte, "Voir mes équipements", "/mes-equipements")),
    )


def _mes_equipements(contexte, limite=20):
    unites = list(unites_visibles(contexte.employe).select_related("article", "affectation__employe", "affectation__direction")
                  .order_by("article__designation")[:limite])
    en_attente = {d.unite_id: d for d in DemandeUnite.objects.filter(unite__in=unites, statut="EN_ATTENTE")}
    return Resultat(
        pour_ia={"total": len(unites), "equipements": [
            {"article": u.article.designation, "numero_serie": u.numero_de_serie, "etat": u.get_etat_display(),
             "attribue_a": "vous" if u.affectation.employe_id == getattr(contexte.employe, "pk", None) else f"votre direction ({u.affectation.nom})",
             "demande_en_cours": en_attente[u.unite_id].get_type_demande_display() if u.unite_id in en_attente else None} for u in unites]},
        tableau=tableau("Mes équipements", ["Équipement", "N° de série", "Attribué à", "Demande en cours"],
                        [[u.article.designation, u.numero_de_serie or "—", "Moi" if u.affectation.employe_id == getattr(contexte.employe, "pk", None)
                          else u.affectation.nom, en_attente[u.unite_id].get_type_demande_display() if u.unite_id in en_attente else "—"] for u in unites],
                        lien=lien_unique(contexte, "Ouvrir Mes équipements", "/mes-equipements")),
    )


OUTILS = [
    Outil("ecarts_inventaire", "Écarts (théorique / physique) d'une session d'inventaire : la dernière validée par défaut, ou par "
          "référence ou par lieu.", {"reference": texte("Référence de la session, facultatif."), "lieu": texte("Lieu inventorié, facultatif.")},
          _ecarts_inventaire, (a.INV_LIRE,)),
    Outil("delais_commandes", "Délai moyen et maximum de traitement des commandes sur une période, et commandes en attente les plus anciennes.",
          parametres_periode(), _delais_commandes, (a.COM_VAL,)),
    Outil("stock_lieu", "Stock par article d'un magasin, d'une direction, d'un site ou d'une salle, aujourd'hui ou à une date donnée.", {
        "lieu": texte("Nom du magasin, de la direction, du site ou de la salle."),
        "date": texte("Date AAAA-MM-JJ, facultatif (aujourd'hui par défaut)."),
    }, _stock_lieu, (a.MOV_LIRE,)),
    Outil("detail_commande", "Détail d'une commande par son numéro : articles, bénéficiaires, statut, traitement.",
          {"numero": entier("Numéro de la commande.", 1, 10**9)}, _detail_commande, (a.COM_DEM, a.COM_VAL)),
    Outil("demandes_unites", "Demandes de retour en stock ou de transfert d'équipements. Le gestionnaire du stock voit toutes les "
          "demandes ; les autres utilisateurs, les leurs.", {
              "statut": texte("Statut.", enum=list(DemandeUnite.Statut.values)),
              "type_demande": texte("Type.", enum=list(DemandeUnite.Type.values)),
              "seulement_les_miennes": {"type": "boolean", "description": "Seulement les demandes faites par l'utilisateur."},
              "limite": entier("Nombre maximum de demandes (15 par défaut)."),
          }, _demandes_unites, (a.COM_DEM, a.INV_GERE)),
    Outil("mes_equipements", "Équipements attribués à l'utilisateur et à sa direction, avec les demandes en cours.",
          {"limite": entier("Nombre maximum d'équipements (20 par défaut).")}, _mes_equipements, (a.COM_DEM,)),
]
