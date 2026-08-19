/**
 * Link interception for SPA navigation.
 * Intercepts clicks on <a> tags with same-origin hrefs and routes
 * them through the Router instead of triggering a full page reload.
 *
 * Opt-out: add `data-external` attribute to links that should navigate normally.
 *
 * @module router/links
 */

/**
 * Install link interception on a root element (typically document).
 * Clicks on same-origin <a> tags will call router.navigate() instead of reloading.
 *
 * @param {Router} router - The router instance
 * @param {EventTarget} [root=document] - The root to listen on (uses event delegation)
 * @returns {Function} cleanup — call to remove the listener
 *
 * @example
 * const cleanup = interceptLinks(router);
 * // Later: cleanup() to stop intercepting
 */
export function interceptLinks(router, root) {
  const handler = (e) => {
    // Only handle left-clicks without modifiers
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Find the nearest <a> ancestor
    const anchor = e.target?.closest?.("a[href]");
    if (!anchor) return;

    // Skip external links (opt-out)
    if (anchor.hasAttribute("data-external")) return;

    // Skip links with target attribute (e.g., target="_blank")
    if (anchor.getAttribute("target")) return;

    // Skip non-http links (mailto:, tel:, etc.)
    const href = anchor.getAttribute("href");
    if (
      !href ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#")
    )
      return;

    // Skip cross-origin links
    if (anchor.origin && anchor.origin !== location?.origin) return;

    // Intercept: prevent default navigation, use router
    e.preventDefault();
    const path = anchor.pathname + (anchor.search || "");
    router.navigate(path);
  };

  const target = root || (typeof document !== "undefined" ? document : null);
  target?.addEventListener("click", handler);

  // Return cleanup function
  return () => {
    target?.removeEventListener("click", handler);
  };
}
