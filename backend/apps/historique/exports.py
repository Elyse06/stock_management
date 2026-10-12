from io import BytesIO

import openpyxl
from openpyxl.styles import Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

_ENTETE = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
_ENTREE = PatternFill(start_color="86EFAC", end_color="86EFAC", fill_type="solid")
_SORTIE = PatternFill(start_color="F87171", end_color="F87171", fill_type="solid")
_RESTE = PatternFill(start_color="FDE68A", end_color="FDE68A", fill_type="solid")
_POLICE_ENTETE = Font(color="FFFFFF", bold=True, size=11)
_BORDURE = Border(*(Side(style="thin"),) * 4)


def _cellule(ws, ligne, colonne, valeur=None, police=None, fond=None):
    cellule = ws.cell(row=ligne, column=colonne, value=valeur)
    cellule.border = _BORDURE
    if police:
        cellule.font = police
    if fond:
        cellule.fill = fond
    return cellule


def _regrouper_par_date(historique):
    jours = {}
    for mvt in historique:
        cle = mvt["date"].strftime("%Y-%m-%d")
        jour = jours.setdefault(
            cle, {"date_str": mvt["date"].strftime("%d/%m/%Y"), "entree": 0, "sortie": 0, "reste": 0}
        )
        if mvt["impact"] > 0:
            jour["entree"] += mvt["impact"]
        elif mvt["impact"] < 0:
            jour["sortie"] += -mvt["impact"]
        jour["reste"] = mvt["stock_cumule"]
    return [jours[cle] for cle in sorted(jours)]


def export_fiche_article(article_code, historique) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Fiche {article_code}"[:31]
    jours = _regrouper_par_date(historique)

    _cellule(ws, 1, 1, "ARTICLES", _POLICE_ENTETE, _ENTETE)
    _cellule(ws, 1, 2, "En stock réel", _POLICE_ENTETE, _ENTETE)
    _cellule(ws, 2, 1, "DATE", Font(bold=True))
    _cellule(ws, 2, 2)
    _cellule(ws, 3, 1, article_code)
    _cellule(ws, 3, 2, historique[0]["stock_cumule"] if historique else 0)

    for i, jour in enumerate(jours):
        colonne = 3 + i * 3
        for decalage, (libelle, fond, cle) in enumerate(
            (("Entrée", _ENTREE, "entree"), ("Sortie", _SORTIE, "sortie"), ("Reste", _RESTE, "reste"))
        ):
            _cellule(ws, 1, colonne + decalage, libelle, _POLICE_ENTETE, fond)
            _cellule(ws, 2, colonne + decalage, jour["date_str"])
            _cellule(ws, 3, colonne + decalage, jour[cle])

    for index, colonne in enumerate(ws.columns, start=1):
        largeur = max((len(str(c.value)) for c in colonne if c.value is not None), default=0)
        ws.column_dimensions[get_column_letter(index)].width = min(largeur + 2, 30)

    tampon = BytesIO()
    wb.save(tampon)
    return tampon.getvalue()
