import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { MENU } from "@/app/router/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";

/** Menu filtré selon les droits, et entrée active selon l'URL. */
export function useNavigation() {
  const { hasAnyAction } = useAuth();
  const { pathname } = useLocation();

  return useMemo(() => {
    const matches = (path) => pathname === path || pathname.startsWith(`${path}/`);
    const visible = (item) =>
      item.children ? item.children.some(visible) : hasAnyAction(...(item.actions ?? []));

    const items = MENU.filter(visible).map((item) =>
      item.children ? { ...item, children: item.children.filter(visible) } : item,
    );
    const activeParent = items.find((item) => item.children?.some((child) => matches(child.path)));
    // L'onglet actif est le chemin le plus spécifique qui correspond.
    const activeChild = activeParent?.children
      .filter((child) => matches(child.path))
      .sort((a, b) => b.path.length - a.path.length)[0];

    const isActive = (item) =>
      item.path ? (item.path === "/" ? pathname === "/" : matches(item.path)) : item === activeParent;

    return { items, activeParent, activeChild, isActive };
  }, [pathname, hasAnyAction]);
}
