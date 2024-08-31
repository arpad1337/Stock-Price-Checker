import {
  CorsMiddleware,
  HttpMethod,
  IRoute,
  RouteBuilder,
  createRouteBuilder,
} from "@greeneyesai/api-utils";
import { LogRequestPathMiddleware } from "../../lib/middlewares/log-request-path";
import { RequestIpMiddleware } from "../../lib/middlewares/request-ip";
import { RateLimitingMiddleware } from "../../lib/middlewares/rate-limiting";
import { RequestIdExtendedMiddleware } from "../../lib/middlewares/request-id-extended";
import { PublicController } from "./controllers/public";
import { 
  PeriodicalStockPriceFetcherCronJob as PeriodicalStockPriceFetcherCronJobImpl 
} from "./jobs/periodical-stock-price-fetcher";

export namespace PublicModule {
  export const PeriodicalStockPriceFetcherCronJob =
    PeriodicalStockPriceFetcherCronJobImpl;
  export function createRoutes(): IRoute[] {
    const publicAPIRouteBuilder: RouteBuilder = createRouteBuilder("/api/v1", [
      new CorsMiddleware({
        origin: "*",
      }),
      new RequestIdExtendedMiddleware({
        headerName: "x-correlation-id",
        returnRequestToken: "correlationId",
      }),
      new LogRequestPathMiddleware(),
      RequestIpMiddleware.create(),
      RateLimitingMiddleware.create(),
    ]);

    const publicRoutes = [
      publicAPIRouteBuilder(
        "/symbol/:symbol",
        HttpMethod.GET,
        PublicController,
        "getSymbolData",
        []
      ),
      publicAPIRouteBuilder(
        "/symbol/:symbol",
        HttpMethod.PUT,
        PublicController,
        "recordSymbolForPeriodicalChecks",
        []
      ),
    ];

    return [...publicRoutes];
  }
}
