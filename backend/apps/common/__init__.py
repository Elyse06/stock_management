"""Modules transverses réutilisables par toutes les sections du backend.

- actions       : codes des droits applicatifs
- permissions   : permissions DRF basées sur les actions (avec cache par requête)
- employees     : employé lié à l'utilisateur connecté, formatage
- pagination    : pagination DRF standard et pagination manuelle pour APIView
- params        : lecture/validation des paramètres de requête
- dates         : plages de dates et de mois
- stock         : calcul de stock (source de vérité unique)
- localisation  : filtres de localisation des bénéficiaires
- serializers   : mixin d'écriture des bénéficiaires
- emails        : envoi d'e-mails HTML échappés
- exceptions    : gestionnaire d'exceptions DRF
- throttling    : limitations de débit
- imports       : outils pour les imports Excel/CSV
"""
