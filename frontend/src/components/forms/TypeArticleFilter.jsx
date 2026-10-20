import { TYPE_ARTICLE_OPTIONS } from "@/constants/articles";

import { SelectFilter } from "./SelectFilter";

/** Filtre « Type d'article » : tous, immobilisations ou fournitures (valeurs "", "true", "false"). */
export function TypeArticleFilter({ value, onChange, label = "Type d'article", minWidth = 170, ...props }) {
  return <SelectFilter label={label} value={value} onChange={onChange} options={TYPE_ARTICLE_OPTIONS} minWidth={minWidth} {...props} />;
}
