import {
  HttpMethod,
  IRoute,
  createRouteBuilder,
  CorsMiddleware,
  RouteBuilder,
} from "@greeneyesai/api-utils";
import { HeartBeatExtendedController } from "./controllers/heart-beat-extended";
import { RequestIdExtendedMiddleware } from "../../lib/middlewares/request-id-extended";

export namespace CommonModule {
  export function createRoutes(): IRoute[] {
    const commonAPIRouteBuilder: RouteBuilder = createRouteBuilder("/common", [
      new CorsMiddleware({
        origin: "*",
      }),
      new RequestIdExtendedMiddleware({
        headerName: "x-correlation-id",
        returnRequestToken: "correlationId",
      }),
    ]);

    const commonRoutes = [
      commonAPIRouteBuilder<HeartBeatExtendedController>(
        "/status",
        HttpMethod.GET,
        HeartBeatExtendedController,
        "heartBeat",
        []
      ),
    ];
    return commonRoutes;
  }
}
