/** Stable route registry for expanded public product pages. */
export const EXTENDED_PUBLIC_ROUTES = [
  "/features", "/solutions", "/pricing", "/compare-plans", "/integrations",
  "/resources", "/blog", "/case-studies", "/roadmap", "/careers",
  "/partners", "/faq", "/403", "/500", "/session-expired"
] as const;

export function isExtendedPublicRoute(path: string): boolean {
  return EXTENDED_PUBLIC_ROUTES.includes(path as (typeof EXTENDED_PUBLIC_ROUTES)[number])
    || /^\/(blog|case-studies)\/[^/]+$/.test(path);
}
