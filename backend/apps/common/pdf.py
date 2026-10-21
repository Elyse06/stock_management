import io
import os
from xml.sax.saxutils import escape

import reportlab
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BLEU, JAUNE, GRIS = colors.HexColor("#01509B"), colors.HexColor("#FECA05"), colors.HexColor("#667085")
FOND = colors.HexColor("#F2F6FB")
LOGO = os.path.join(os.path.dirname(__file__), "assets", "tahiry-logo.png")
MARGE = 1.8 * cm

_polices = os.path.join(os.path.dirname(reportlab.__file__), "fonts")
for nom, fichier in (("Tahiry", "Vera.ttf"), ("Tahiry-Gras", "VeraBd.ttf"), ("Tahiry-Italique", "VeraIt.ttf")):
    if nom not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(nom, os.path.join(_polices, fichier)))

TEXTE = ParagraphStyle("texte", fontName="Tahiry", fontSize=9, leading=12)
PETIT = ParagraphStyle("petit", parent=TEXTE, fontSize=8, leading=10, textColor=GRIS)
GRAS = ParagraphStyle("gras", parent=TEXTE, fontName="Tahiry-Gras")
TITRE = ParagraphStyle("titre", fontName="Tahiry-Gras", fontSize=15, leading=19, textColor=BLEU, alignment=TA_RIGHT)
SOUS_TITRE = ParagraphStyle("sous_titre", parent=TEXTE, fontSize=10, alignment=TA_RIGHT, textColor=GRIS)
SECTION = ParagraphStyle("section", fontName="Tahiry-Gras", fontSize=10.5, leading=14, textColor=BLEU, spaceBefore=10, spaceAfter=4)


def p(texte, style=TEXTE):
    return Paragraph(escape(str(texte if texte not in (None, "") else "—")).replace("\n", "<br/>"), style)


def nombre(valeur):
    if valeur in (None, ""):
        return "—"
    texte = f"{valeur:f}".rstrip("0").rstrip(".") if hasattr(valeur, "as_tuple") else f"{valeur:g}"
    return texte.replace(".", ",")


def date_fr(valeur, heure=True):
    if not valeur:
        return "—"
    return timezone.localtime(valeur).strftime("%d/%m/%Y à %H:%M" if heure else "%d/%m/%Y")


def section(titre):
    return Paragraph(escape(titre), SECTION)


def informations(paires, colonnes=2):
    cellules = [[p(libelle, PETIT), p(valeur)] for libelle, valeur in paires]
    if colonnes == 2:
        lignes = [cellules[i] + (cellules[i + 1] if i + 1 < len(cellules) else ["", ""]) for i in range(0, len(cellules), 2)]
        largeurs = [3.4 * cm, 5.3 * cm, 3.4 * cm, 5.3 * cm]
    else:
        lignes, largeurs = cellules, [4 * cm, 13.4 * cm]
    table = Table(lignes, colWidths=largeurs)
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3)]))
    return table


def tableau(entete, lignes, largeurs):
    donnees = [[p(t, GRAS) for t in entete]] + [[c if isinstance(c, Paragraph | list) else p(c) for c in ligne] for ligne in lignes]
    table = Table(donnees, colWidths=largeurs, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOND), ("LINEBELOW", (0, 0), (-1, 0), 1.2, JAUNE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def signatures(cadres):
    largeur = 17.4 * cm / len(cadres)
    cellules = [[p(titre, GRAS), p(nom or " "), Spacer(1, 0.3 * cm), p("Date :", PETIT), Spacer(1, 0.5 * cm),
                 p("Signature :", PETIT), Spacer(1, 1.6 * cm)] for titre, nom in cadres]
    table = Table([cellules], colWidths=[largeur] * len(cadres))
    table.setStyle(TableStyle([("BOX", (i, 0), (i, 0), 0.6, GRIS) for i in range(len(cadres))]
                              + [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    return KeepTogether([Spacer(1, 0.6 * cm), table])


class _CanvasNumerote(rl_canvas.Canvas):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pages = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for etat in self._pages:
            self.__dict__.update(etat)
            self.setFont("Tahiry", 7.5)
            self.setFillColor(GRIS)
            self.drawRightString(A4[0] - MARGE, 1.1 * cm, f"Page {self._pageNumber} / {total}")
            super().showPage()
        super().save()


def fiche_pdf(titre, numero, statut, blocs):
    tampon = io.BytesIO()
    edition = timezone.localtime().strftime("%d/%m/%Y à %H:%M")

    def decor(canvas, doc, premiere=False):
        canvas.saveState()
        if premiere:
            canvas.setStrokeColor(JAUNE)
            canvas.setLineWidth(2)
            canvas.line(MARGE, A4[1] - 3.3 * cm, A4[0] - MARGE, A4[1] - 3.3 * cm)
        canvas.setFont("Tahiry", 7.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(MARGE, 1.1 * cm, f"Tahiry · Paositra Malagasy · Édité le {edition}")
        canvas.restoreState()

    entete = Table([[Image(LOGO, width=3.4 * cm, height=1.05 * cm), [p(titre, TITRE), p(f"{statut}", SOUS_TITRE)]]],
                   colWidths=[5 * cm, 12.4 * cm])
    entete.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    doc = SimpleDocTemplate(tampon, pagesize=A4, leftMargin=MARGE, rightMargin=MARGE, topMargin=1.2 * cm, bottomMargin=1.8 * cm,
                            title=f"{titre} {numero}", author="Tahiry - Paositra Malagasy")
    doc.build([entete, Spacer(1, 0.7 * cm), *blocs], onFirstPage=lambda c, d: decor(c, d, premiere=True),
              onLaterPages=decor, canvasmaker=_CanvasNumerote)
    return tampon.getvalue()


def reponse_pdf(contenu, nom_fichier):
    reponse = HttpResponse(contenu, content_type="application/pdf")
    reponse["Content-Disposition"] = f'attachment; filename="{nom_fichier}"'
    reponse["Cache-Control"] = "no-store"
    return reponse
