const PREVIEW_BASE_RE = /^(\/api\/v1\/preview\/\d+|\/s\/[A-Za-z0-9]+)(?:\/|$)/;

export function getPreviewRouterBasename(
  pathname: string = window.location.pathname,
): string | undefined {
  const match = pathname.match(PREVIEW_BASE_RE);
  return match?.[1];
}
