import { Middleware, NativeMiddleware } from "@greeneyesai/api-utils";
import { Request, Response, NextFunction } from "express";
import * as requestIp from "request-ip";

export type RequestWithClientIp = Request & { clientIp: string };

export class RequestIpMiddleware extends Middleware {
  public static create(): RequestIpMiddleware {
    return new this(requestIp.mw());
  }

  protected constructor(protected _wrappedMiddleware: NativeMiddleware) {
    super();
  }

  public handle(req: Request, res: Response, next: NextFunction) {
    delete req.headers["x-client-ip"];
    return this._wrappedMiddleware(req, res, next);
  }
}
