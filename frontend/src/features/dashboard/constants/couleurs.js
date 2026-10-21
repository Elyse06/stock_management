/** Couleurs du tableau de bord (charte Paositra) et style commun des graphiques. */
export const BLEU = "#01509B";
export const BLEU_CLAIR = "#3A7BBF";
export const JAUNE = "#FECA05";
export const ORANGE = "#F99813";
export const GRIS_TEXTE = "#667085";
export const BORDURE = "#E8EDF3";

/** Couleurs successives des catégories (alternance bleus / jaunes). */
export const PALETTE = [BLEU, JAUNE, BLEU_CLAIR, ORANGE, "#7FA8D6", "#FFDD55", "#003A73", "#B0BEC5"];

export const STYLE_INFOBULLE = {
  contentStyle: { borderRadius: 10, border: `1px solid ${BORDURE}`, boxShadow: "0 4px 12px rgba(16,24,40,0.08)", fontSize: 12 },
  labelStyle: { fontWeight: 600, color: "#101828" },
};

export const AXE = { tick: { fontSize: 11, fill: GRIS_TEXTE }, axisLine: false, tickLine: false };
