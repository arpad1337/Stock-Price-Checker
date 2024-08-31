import { ErrorLike, Middleware, RequestWithId } from "@greeneyesai/api-utils";
import { Request, Response, NextFunction } from "express";

export type RequestForLogRequestPathMiddleware = Request & RequestWithId;

export class LogRequestPathMiddleware extends Middleware {
  public async handle(
    req: RequestForLogRequestPathMiddleware,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const self = this;

    const originalJSON = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    res.json = function (
      this: RequestForLogRequestPathMiddleware,
      ...args: any[]
    ) {
      if (
        res.statusCode !== 500 &&
        args[0].status &&
        args[0].status === "error"
      ) {
        self.logger?.error(new ErrorLike(args[0].message).setToken(req.token));
      }
      return originalJSON(...args);
    };
    res.end = function (
      this: RequestForLogRequestPathMiddleware,
      ...args: any[]
    ) {
      self.logger?.info(
        `[${req.method.toUpperCase()}] ${req.originalUrl} ${res.statusCode}`,
        {
          token: req.token,
        }
      );
      return originalEnd(...args);
    };
    this.logger?.info(`[${req.method.toUpperCase()}] ${req.originalUrl} ...`, {
      token: req.token,
    });
    return next();
  }
}
