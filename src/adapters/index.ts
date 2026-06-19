import type { Handler } from "aws-lambda";

/**
 * Resolves the raw host for the request URL from a Lambda event.
 *
 * Return `undefined`/`null` to fall back to the adapter default (the
 * `x-forwarded-host` header, falling back to the `host`/`Host` header). The
 * returned value is sanitized via {@link resolveHost} before use.
 */
export type GetHostFunction<E> = (event: E) => string | null | undefined;

export interface ReactRouterAdapter<E, Ret, Res = void, H = Handler<E, Ret>> {
  wrapHandler: (handler: (event: E, res: Res) => Promise<Ret>) => H;
  createReactRouterRequest: (event: E, getHost?: GetHostFunction<E>) => Request;
  sendReactRouterResponse: (nodeResponse: Response, response: Res) => Promise<Ret>;
}
