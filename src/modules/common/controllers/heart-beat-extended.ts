import {
  HeartBeatController,
  IApplicationResponse,
} from "@greeneyesai/api-utils";
import { Request, Response, NextFunction } from "express";

export class HeartBeatExtendedController extends HeartBeatController {
  protected get commitSHA(): string | undefined {
    return this.context?.env?.CI_COMMIT_SHORT_SHA;
  }

  public heartBeat(req: Request, res: Response, next: NextFunction): void {
    const originalJSONSerializer = res.json.bind(res);
    res.json = (body: IApplicationResponse<undefined>): typeof res => {
      body["version"] = this.commitSHA;
      return originalJSONSerializer(body);
    };
    return super.heartBeat(req, res, next);
  }
}
