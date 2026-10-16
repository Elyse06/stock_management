"""Questions de l'évaluation et vérifications attendues (sur le jeu de données de donnees.py).

Vérifications possibles :
- outils : au moins un de ces outils doit être appelé ;
- arguments : {outil: {argument: valeur attendue (contenue, sans accents ni casse)}} ;
- contient : textes tous présents dans la réponse ou les tableaux ;
- contient_un : au moins un de ces textes présent ;
- absent : textes qui ne doivent PAS apparaître (données hors droits) ;
- interdits : outils qui ne doivent pas être appelés ;
- precision : la réponse doit demander une précision (choix proposés ou question posée).
Une question « informative » est affichée dans le rapport sans compter dans le score.
Une question avec « suite » se pose en deux tours : « suite » d'abord, puis « question » avec l'historique.
"""

CAS = [
    # --- Catalogue et stock (recherche tolérante) ---
    {"id": "S1", "theme": "Stock", "profil": "gestionnaire", "question": "Combien d'ordinateurs portables Dell avons-nous en stock ?",
     "outils": ["rechercher_articles", "stock_article"], "contient": ["2", "dell"]},
    {"id": "S2", "theme": "Stock", "profil": "gestionnaire", "question": "Reste-t-il des ramettes de papier ?",
     "outils": ["rechercher_articles", "stock_article"], "contient": ["65"]},
    {"id": "S3", "theme": "Stock", "profil": "gestionnaire", "question": "Quels articles sont sous leur seuil d'alerte ?",
     "outils": ["rechercher_articles", "indicateurs_stock"], "contient": ["HP 305", "ProBook"]},
    {"id": "S4", "theme": "Stock", "profil": "gestionnaire", "question": "Quels articles sont en rupture de stock ?",
     "outils": ["rechercher_articles", "indicateurs_stock"], "contient": ["ProBook"], "absent": ["Ramette"]},
    {"id": "S5", "theme": "Stock", "profil": "gestionnaire", "question": "Combien de cartouches d'encre HP 305 reste-t-il ?",
     "outils": ["rechercher_articles", "stock_article"], "contient": ["3"]},
    {"id": "S6", "theme": "Stock", "profil": "gestionnaire", "question": "stock des cartouche dencre canon",
     "outils": ["rechercher_articles", "stock_article"], "contient": ["12"]},
    {"id": "S7", "theme": "Stock", "profil": "gestionnaire", "question": "Où sont stockées les chaises de bureau ?",
     "outils": ["stock_article", "rechercher_articles"], "contient": ["Magasin central"]},
    {"id": "S8", "theme": "Stock", "profil": "gestionnaire", "question": "Fais-moi un point sur l'état du stock.",
     "outils": ["indicateurs_stock"], "contient": ["ProBook"]},
    # --- Ambiguïté ---
    {"id": "A1", "theme": "Ambiguïté", "profil": "gestionnaire", "question": "Quel est le stock de la cartouche ?",
     "outils": ["stock_article", "rechercher_articles"], "precision": True},
    {"id": "A2", "theme": "Ambiguïté", "profil": "gestionnaire", "question": "Donne-moi le stock de l'ordinateur portable.",
     "outils": ["stock_article", "rechercher_articles"], "precision": True},
    # --- Périodes ---
    {"id": "P1", "theme": "Périodes", "profil": "gestionnaire", "question": "Quelles sorties de stock ont eu lieu la semaine dernière ?",
     "arguments": {"mouvements_recents": {"periode": "semaine_derniere"}}, "contient": ["30", "ramette"]},
    {"id": "P2", "theme": "Périodes", "profil": "gestionnaire", "question": "Combien de ramettes sont sorties cette semaine ?",
     "arguments": {"mouvements_recents": {"periode": "cette_semaine"}}, "contient": ["5"]},
    {"id": "P3", "theme": "Périodes", "profil": "gestionnaire", "question": "Quelles ont été les entrées de stock sur les 12 derniers mois ?",
     "arguments": {"mouvements_recents": {"periode": "12_derniers_mois"}}, "contient": ["100"]},
    {"id": "P4", "theme": "Périodes", "profil": "gestionnaire", "question": "Combien de commandes ont été passées ces 7 derniers jours ?",
     "arguments": {"commandes": {"periode": "7_derniers_jours"}}, "contient": ["2"]},
    # --- Commandes (visibilité selon le rôle) ---
    {"id": "C1", "theme": "Commandes", "profil": "demandeur", "question": "Où en sont mes commandes ?",
     "outils": ["commandes"], "contient": ["attente"], "absent": ["ANDRIA", "comptabilit"]},
    {"id": "C2", "theme": "Commandes", "profil": "gestionnaire", "question": "Quelles commandes attendent ma validation finale ?",
     "arguments": {"commandes": {"statut": "EN_COURS"}}, "contient": ["ANDRIA"]},
    {"id": "C3", "theme": "Commandes", "profil": "chef", "question": "Quelles commandes de ma direction sont en attente ?",
     "outils": ["commandes"], "contient": ["RABE"], "absent": ["ANDRIA"]},
    # --- Unités attribuées ---
    {"id": "U1", "theme": "Unités", "profil": "gestionnaire", "question": "Quel matériel est attribué à RABE Marie ?",
     "outils": ["unites_attribuees"], "contient": ["SN-DELL-001"]},
    {"id": "U2", "theme": "Unités", "profil": "gestionnaire", "question": "Quels équipements sont attribués à la direction DSI ?",
     "outils": ["unites_attribuees"], "contient": ["SN-DELL-002"]},
    {"id": "U3", "theme": "Unités", "profil": "gestionnaire", "question": "À qui est attribué l'ordinateur SN-DELL-001 ?",
     "outils": ["unites_attribuees"], "contient": ["RABE"]},
    # --- Inventaires et annuaire ---
    {"id": "I1", "theme": "Inventaires", "profil": "gestionnaire", "question": "Y a-t-il des inventaires en attente de validation ?",
     "outils": ["inventaires"], "contient": ["INV-EVAL-001"]},
    {"id": "E1", "theme": "Annuaire", "profil": "demandeur", "question": "Qui est le chef de service de la DSI ?",
     "outils": ["rechercher_employes"], "contient": ["RAZAFY"]},
    {"id": "E2", "theme": "Annuaire", "profil": "demandeur", "question": "Quel est le matricule d'ANDRIA Paul ?",
     "outils": ["rechercher_employes"], "contient": ["M-2001"]},
    # --- Navigation ---
    {"id": "N1", "theme": "Navigation", "profil": "demandeur", "question": "Comment faire une demande de matériel ?",
     "outils": ["aide_navigation"], "contient": ["Nouvelle demande"]},
    {"id": "N2", "theme": "Navigation", "profil": "demandeur", "question": "Où puis-je voir le matériel qui m'est attribué ?",
     "outils": ["aide_navigation"], "contient": ["Mes équipements"]},
    {"id": "N3", "theme": "Navigation", "profil": "gestionnaire", "question": "Comment réaliser un inventaire ?",
     "outils": ["aide_navigation"], "contient": ["Réalisation de l'inventaire"]},
    # --- Droits ---
    {"id": "D1", "theme": "Droits", "profil": "demandeur", "question": "Montre-moi les derniers mouvements de stock.",
     "interdits": ["mouvements_recents"], "contient_un": ["accès", "droit", "autoris", "permission"], "absent": ["Sortie"]},
    {"id": "D2", "theme": "Droits", "profil": "autre_direction", "question": "Quelles commandes RABE Marie a-t-elle passées ?",
     "absent": ["Fournitures du service", "Remplacement de chaise"]},
    {"id": "D3", "theme": "Droits", "profil": "demandeur", "question": "Comment créer un compte utilisateur ?",
     "contient_un": ["accès", "droit", "administrateur", "autoris"]},
    # --- Contexte de la page affichée ---
    {"id": "K1", "theme": "Contexte de page", "profil": "gestionnaire", "page": "/catalogue/articles/CART-HP",
     "question": "Combien en reste-t-il ?", "outils": ["stock_article", "rechercher_articles"], "contient": ["3"]},
    {"id": "K2", "theme": "Contexte de page", "profil": "gestionnaire", "page": "/catalogue/articles/LAPDELL",
     "question": "Où sont-ils stockés ?", "outils": ["stock_article"], "contient": ["Magasin central"]},
    # --- Étape 2 : analyses ---
    {"id": "R1", "theme": "Réapprovisionnement", "profil": "gestionnaire", "question": "Quels articles faut-il commander en priorité ?",
     "outils": ["reapprovisionnement"], "contient": ["HP 305", "22", "ProBook"]},
    {"id": "R2", "theme": "Réapprovisionnement", "profil": "gestionnaire", "question": "Combien de cartouches HP 305 faut-il commander ?",
     "outils": ["reapprovisionnement"], "contient": ["22"]},
    {"id": "Q1", "theme": "Consommation", "profil": "gestionnaire",
     "question": "Combien de ramettes chaque direction a-t-elle consommées ces 3 derniers mois ?",
     "arguments": {"consommation": {"regroupement": "direction"}}, "contient": ["DAF", "40", "DSI", "35"]},
    {"id": "Q2", "theme": "Consommation", "profil": "gestionnaire",
     "question": "Quelle quantité de ramettes a été consommée chaque mois sur les 12 derniers mois ?",
     "arguments": {"consommation": {"regroupement": "mois"}}, "contient": ["40"]},
    {"id": "Q3", "theme": "Consommation", "profil": "gestionnaire",
     "question": "A-t-on consommé plus de ramettes cette semaine que la semaine dernière ?",
     "outils": ["comparer_periodes"], "contient": ["30", "5"]},
    {"id": "V1", "theme": "Valeur du stock", "profil": "gestionnaire", "question": "Quelle est la valeur totale de notre stock ?",
     "outils": ["valeur_stock"], "contient": ["10 244 829"]},
    {"id": "V2", "theme": "Droits", "profil": "demandeur", "question": "Quelle est la valeur de notre stock ?",
     "interdits": ["valeur_stock"], "absent": ["10 244 829"]},
    {"id": "I2", "theme": "Inventaires", "profil": "gestionnaire", "question": "Quels écarts le dernier inventaire validé a-t-il révélés ?",
     "outils": ["ecarts_inventaire"], "contient": ["5", "Ramette"]},
    {"id": "C4", "theme": "Commandes", "profil": "gestionnaire", "question": "Combien de temps faut-il en moyenne pour traiter une commande ?",
     "outils": ["delais_commandes"], "contient": ["3"]},
    {"id": "C5", "theme": "Commandes", "profil": "gestionnaire", "question": "Que contient la commande n°3 ?",
     "outils": ["detail_commande"], "contient": ["Canon"]},
    {"id": "D4", "theme": "Droits", "profil": "demandeur", "question": "Que contient la commande n°3 ?", "absent": ["Canon", "ANDRIA"]},
    {"id": "L1", "theme": "Lieux", "profil": "gestionnaire", "question": "Qu'y a-t-il en stock au Magasin central ?",
     "outils": ["stock_lieu"], "contient": ["65"]},
    {"id": "L2", "theme": "Lieux", "profil": "gestionnaire", "question": "Quel est le stock à Toamasina ?",
     "outils": ["stock_lieu"], "precision": True},
    {"id": "X1", "theme": "Demandes et équipements", "profil": "demandeur",
     "question": "Ai-je des demandes de retour ou de transfert en cours ?", "outils": ["demandes_unites"], "contient": ["SN-DELL-001"]},
    {"id": "X2", "theme": "Demandes et équipements", "profil": "demandeur", "question": "Quel matériel m'est attribué ?",
     "outils": ["mes_equipements", "unites_attribuees"], "contient": ["SN-DELL-001", "SN-DELL-002"]},
    # --- Questions de suite (deux tours : la question « suite » est posée d'abord) ---
    {"id": "M1", "theme": "Questions de suite", "profil": "gestionnaire", "suite": "Quel est le stock de cartouches d'encre HP 305 ?",
     "question": "Et combien en a-t-on consommé ces 3 derniers mois ?", "outils": ["consommation", "mouvements_recents"], "contient": ["22"]},
    {"id": "M2", "theme": "Questions de suite", "profil": "gestionnaire", "suite": "Quelles sorties de stock ont eu lieu la semaine dernière ?",
     "question": "Et cette semaine ?", "outils": ["mouvements_recents", "consommation"], "contient": ["5"]},
]
