"""Évaluation de l'assistant : pose chaque question au modèle configuré et applique les vérifications."""
import json
import time

from apps.ai.assistant import repondre
from apps.ai.outils.texte import normaliser


class _Requete:
    """Requête minimale : l'assistant n'utilise que l'utilisateur."""

    def __init__(self, user):
        self.user = user


def _corpus(reponse):
    morceaux = [reponse.get("reply", "")]
    for t in reponse.get("tableaux", []):
        morceaux += [t.get("titre", ""), *(" ".join(map(str, ligne)) for ligne in t.get("lignes", []))]
    morceaux += [c.get("libelle", "") for c in reponse.get("choix", [])]
    return normaliser(" ".join(morceaux))


def _arguments(appel):
    try:
        return json.loads(appel.get("arguments") or "{}")
    except (TypeError, ValueError):
        return {}


def verifier(cas, reponse, trace):
    """Liste de (vérification, réussie, détail)."""
    corpus, appels = _corpus(reponse), [t["outil"] for t in trace]
    resultats = []
    if cas.get("outils"):
        resultats.append(("outil attendu", any(o in appels for o in cas["outils"]), " ou ".join(cas["outils"])))
    for outil, attendus in cas.get("arguments", {}).items():
        appels_outil = [_arguments(t) for t in trace if t["outil"] == outil]
        ok = any(all(normaliser(v) in normaliser(args.get(k, "")) for k, v in attendus.items()) for args in appels_outil)
        resultats.append((f"{outil}({', '.join(f'{k}={v}' for k, v in attendus.items())})", ok,
                          "; ".join(json.dumps(a, ensure_ascii=False) for a in appels_outil) or "outil non appelé"))
    for texte in cas.get("contient", []):
        resultats.append((f"contient « {texte} »", normaliser(texte) in corpus, ""))
    if cas.get("contient_un"):
        resultats.append((f"contient l'un de {cas['contient_un']}", any(normaliser(t) in corpus for t in cas["contient_un"]), ""))
    for texte in cas.get("absent", []):
        resultats.append((f"n'affiche pas « {texte} »", normaliser(texte) not in corpus, ""))
    for outil in cas.get("interdits", []):
        resultats.append((f"n'appelle pas {outil}", outil not in appels, ""))
    if cas.get("precision"):
        demande = bool(reponse.get("choix")) or "?" in reponse.get("reply", "")
        resultats.append(("demande une précision", demande, ""))
    return resultats


def evaluer_cas(cas, utilisateurs):
    trace, debut = [], time.monotonic()
    requete = _Requete(utilisateurs[cas["profil"]])
    try:
        historique = []
        if cas.get("suite"):  # premier tour, comme dans l'interface : réponse + outils utilisés renvoyés avec l'historique
            premiere = repondre(requete, cas["suite"], page=cas.get("page"))
            historique = [{"role": "user", "content": cas["suite"]},
                          {"role": "assistant", "content": premiere["reply"], "outils": premiere.get("outils_utilises", [])}]
        reponse = repondre(requete, cas["question"], historique=historique, page=cas.get("page"), trace=trace)
        erreur = None
    except Exception as exc:  # noqa: BLE001 - une erreur du modèle est un échec du cas, pas de l'évaluation
        reponse, erreur = {"reply": "", "tableaux": [], "choix": []}, str(exc)
    verifications = verifier(cas, reponse, trace) if erreur is None else [("réponse obtenue", False, erreur)]
    return {"cas": cas, "reponse": reponse, "trace": trace, "verifications": verifications,
            "reussi": all(ok for _, ok, _ in verifications), "duree": time.monotonic() - debut}


def rapport_markdown(resultats, modele):
    notes = [r for r in resultats if not r["cas"].get("informatif")]
    reussis = sum(r["reussi"] for r in notes)
    lignes = [f"# Évaluation de l'assistant — modèle `{modele}`", "",
              f"**Score : {reussis} / {len(notes)} ({round(100 * reussis / len(notes)) if notes else 0} %)**", "",
              "| Thème | Réussis |", "|---|---|"]
    for theme in dict.fromkeys(r["cas"]["theme"] for r in resultats):
        du_theme = [r for r in resultats if r["cas"]["theme"] == theme]
        informatif = du_theme[0]["cas"].get("informatif")
        lignes.append(f"| {theme}{' (informatif)' if informatif else ''} | {sum(r['reussi'] for r in du_theme)} / {len(du_theme)} |")
    lignes += ["", "## Détail", ""]
    for r in resultats:
        cas = r["cas"]
        lignes += [f"### {'✅' if r['reussi'] else '❌'} {cas['id']} · {cas['theme']} · {cas['profil']}"
                   f"{' · page ' + cas['page'] if cas.get('page') else ''}", "",
                   *([f"**Question précédente :** {cas['suite']}", ""] if cas.get("suite") else []),
                   f"**Question :** {cas['question']}", "",
                   f"**Outils appelés :** {', '.join(f'{t['outil']}({t['arguments']})' for t in r['trace']) or 'aucun'}", "",
                   f"**Réponse :** {r['reponse'].get('reply', '').strip() or '—'}", ""]
        echecs = [f"- ❌ {nom}{f' — {detail}' if detail else ''}" for nom, ok, detail in r["verifications"] if not ok]
        lignes += (["**Vérifications échouées :**", *echecs, ""] if echecs else [])
        lignes += [f"*{r['duree']:.1f} s*", ""]
    return "\n".join(lignes)
