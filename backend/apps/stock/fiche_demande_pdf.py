from apps.common.pdf import date_fr, fiche_pdf, informations, section, signatures
from apps.stock.models import DemandeUnite


def generer_fiche_demande(demande):
    demandeur, unite, mouvement = demande.demandeur, demande.unite, demande.mouvement
    retour = demande.type_demande == DemandeUnite.Type.RETOUR
    magasin = None
    if mouvement:
        magasin = mouvement.magasin_destination if retour else mouvement.magasin_source
    traitee = demande.statut != DemandeUnite.Statut.EN_ATTENTE
    equipement = [
        ("Article", f"{unite.article.designation} ({unite.article.code_article})"),
        ("État", unite.get_etat_display()),
        ("Bénéficiaire lors de la demande", demande.affectation_origine.nom),
    ]
    if not retour:
        equipement.append(("Nouveau bénéficiaire", demande.nouvelle_affectation.nom if demande.nouvelle_affectation else "—"))
    blocs = [
        section("Demande"),
        informations([("Date de la demande", date_fr(demande.date_demande)), ("Statut", demande.get_statut_display()),
                      ("Type", demande.get_type_demande_display()), ("Motif", demande.motif or "—")]),
        section("Demandeur"),
        informations([
            ("Nom", getattr(demandeur, "emp_nom", None)), ("Matricule", getattr(demandeur, "emp_matricule", None)),
            ("Fonction", getattr(demandeur, "emp_fonction", None)),
            ("Direction", getattr(getattr(demandeur, "emp_dir_id", None), "dir_libelle", None)),
        ]),
        section("Équipement"),
        informations(equipement),
        section("Traitement"),
        informations([
            ("Traitée par", demande.traitant.emp_nom if traitee and demande.traitant else "Non traitée"),
            ("Le", date_fr(demande.date_traitement) if traitee else "—"),
            ("Mouvement", f"n°{mouvement.mouvement_id}" if mouvement else "—"),
            ("Magasin", magasin.magasin_nom if magasin else "—"),
            ("Réponse du gestionnaire", demande.commentaire_traitement or "—"),
        ]),
        signatures([("Le demandeur", getattr(demandeur, "emp_nom", "")),
                    ("Le gestionnaire du stock", demande.traitant.emp_nom if traitee and demande.traitant else "")]),
    ]
    titre = "Fiche de demande de retour en stock" if retour else "Fiche de demande de transfert"
    return fiche_pdf(titre, f"Demande n°{demande.pk}", demande.get_statut_display(), blocs)
