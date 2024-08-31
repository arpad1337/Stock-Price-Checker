import { RequestIdMiddleware, RequestWithId } from "@greeneyesai/api-utils";
import { Response, NextFunction } from "express";
import * as yup from "yup";

export class RequestIdExtendedMiddleware extends RequestIdMiddleware {
  public handle(
    req: RequestWithId,
    res: Response<any, Record<string, any>>,
    next: NextFunction
  ): void {
    super.handle(req, res, async (e?: Error | string) => {
      await yup
        .string()
        .uuid("Invalid correlation id format")
        .validate(req.token, { strict: true });
      res.set("X-Correlation-Id", req.token);
      next(e);
    });
  }
}
