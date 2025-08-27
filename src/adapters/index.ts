import { Handler } from "aws-lambda";

export interface ReactRouterAdapter<E, Ret, Res = void, H = Handler<E, Ret>> {
  wrapHandler: (handler: (event: E, res: Res) => Promise<Ret>) => H;
  createReactRouterRequest: (event: E) => Request;
  sendReactRouterResponse: (nodeResponse: Response, response: Res) => Promise<Ret>;
}
