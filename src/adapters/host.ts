/**
 * Resolves the host used to build the `Request` URL from a raw host value
 * (e.g. an API Gateway request-context domain name, or a `Host`/forwarded
 * header).
 *
 * React Router derives the host for its built-in cross-origin (CSRF) check on
 * action requests from `new URL(request.url).host`, so the host constructed
 * here must be trustworthy and well-formed. Invalid characters are stripped and
 * the port is validated to avoid constructing a malformed URL (or leaking a
 * spoofed host) from a garbled header value.
 *
 * Mirrors the hardening done by the upstream `@react-router/architect` adapter.
 */
export function resolveHost(rawHost: string | undefined | null): string {
  const [rawHostname = "", portStr] = (rawHost ?? "").split(":");
  const hostname = rawHostname.split(/[\\/?#@]/)[0] || "localhost";
  const hostPort = Number.parseInt(portStr ?? "", 10);
  const port = Number.isSafeInteger(hostPort) ? hostPort : undefined;
  return `${hostname}${port ? `:${port}` : ""}`;
}
