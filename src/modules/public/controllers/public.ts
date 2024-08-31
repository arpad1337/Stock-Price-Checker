import {
  Controller,
  ControllerError,
  DatabaseProvider,
  ErrorLike,
  RequestWithId,
  ResponseFormatter,
  SingletonClassType,
} from "@greeneyesai/api-utils";
import { Response, NextFunction } from "express";
import * as yup from "yup";
import { FinnhubAdapter } from "../adapters/finnhub";
import { StockToWatchModelTypeStatic } from "../../../lib/models/stock-to-watch";
import {
  StockPriceModelType,
  StockPriceModelTypeStatic,
} from "../../../lib/models/stock-price";

export interface ISymbolResponseBody {
  currentPrice: number;
  movingAverage: number;
  lastCheckedAt: string;
}

export class PublicController extends Controller {
  public static get Dependencies(): [
    SingletonClassType<DatabaseProvider>,
    SingletonClassType<FinnhubAdapter>
  ] {
    return [DatabaseProvider, FinnhubAdapter];
  }

  public constructor(
    protected _databaseProvider: DatabaseProvider,
    protected _finnhubAdapter: FinnhubAdapter
  ) {
    super();
  }

  // [GET] /api/v1/symbol/:symbol
  public async getSymbolData(
    req: RequestWithId,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validationSchema: yup.Schema = yup.object({
        symbol: yup
          .string()
          .min(1, "Symbol must be at least 1 character")
          .max(5, "Symbol must be maximum 5 character")
          .required("Symbol missing"),
      });

      await validationSchema.validate(req.params, { strict: true });

      const symbol: string = req.params.symbol!;

      const StockToWatchModel: StockToWatchModelTypeStatic =
        this._databaseProvider.getModelByName<StockToWatchModelTypeStatic>(
          "stock-to-watch"
        )!;

      const stock = await StockToWatchModel.findOne({
        where: { ticker: symbol },
      });

      if (!stock) {
        const e = new ControllerError(`Symbol ${symbol} is not found`);
        res.status(404).json(new ResponseFormatter(e).toErrorResponse());
        return;
      }

      try {
        const { currentPrice } = await this._finnhubAdapter.wrappedAPICall(
          req.token!,
          "getPriceForTicker",
          symbol,
          symbol
        )();

        const StockPriceModel: StockPriceModelTypeStatic =
          this._databaseProvider.getModelByName<StockPriceModelTypeStatic>(
            "stock-price"
          )!;

        const lastStockPrices = await StockPriceModel.findAll({
          where: {
            stockId: stock.get("objectId") as number,
          },
          order: [["createdAt", "DESC"]],
          limit: 10,
        });

        const responseBody: ISymbolResponseBody = {
          currentPrice,
          movingAverage:
            lastStockPrices.length > 0
              ? lastStockPrices.reduce(
                  (accu: number, el: StockPriceModelType) =>
                    (accu + (el.get("price") as number)) as number,
                  0
                ) / lastStockPrices.length
              : currentPrice,
          lastCheckedAt: (lastStockPrices.length > 0
            ? lastStockPrices[0].get("createdAt")
            : stock.get("createdAt")) as string,
        };

        res.status(200).json(new ResponseFormatter(responseBody).toResponse());
      } catch (e) {
        this.logger?.error(ErrorLike.createFromError(e as Error).setToken(req.token));
        const err = new ControllerError(`Symbol ${symbol} is not found`);
        res.status(404).json(new ResponseFormatter(err).toErrorResponse());
        return;
      }
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      )
        .clone()
        .setToken(req.token);
      return next(err);
    }
  }

  // [PUT] /api/v1/symbol/:symbol
  public async recordSymbolForPeriodicalChecks(
    req: RequestWithId,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validationSchema: yup.Schema = yup.object({
        symbol: yup
          .string()
          .min(1, "Symbol must be at least 1 character")
          .max(5, "Symbol must be maximum 5 character")
          .required("Symbol missing"),
      });

      await validationSchema.validate(req.params, { strict: true });

      const symbol: string = req.params.symbol!;

      const StockToWatchModel: StockToWatchModelTypeStatic =
        this._databaseProvider.getModelByName<StockToWatchModelTypeStatic>(
          "stock-to-watch"
        )!;

      let stock = await StockToWatchModel.findOne({
        where: { ticker: symbol },
      });

      if (!!stock) {
        const e = new ControllerError(`Symbol ${symbol} is already added`);
        res.status(400).json(new ResponseFormatter(e).toErrorResponse());
        return;
      }

      try {
        const { currentPrice } = await this._finnhubAdapter.wrappedAPICall(
          req.token!,
          "getPriceForTicker",
          symbol,
          symbol
        )();

        stock = await StockToWatchModel.createWithTicker(symbol);

        const responseBody: ISymbolResponseBody = {
          currentPrice,
          movingAverage: currentPrice,
          lastCheckedAt: stock.get("createdAt") as string,
        };

        res.status(200).json(new ResponseFormatter(responseBody).toResponse());
      } catch (e) {
        this.logger?.error(ErrorLike.createFromError(e as Error).setToken(req.token));
        const err = new ControllerError(`Symbol ${symbol} is not found`);
        res.status(404).json(new ResponseFormatter(err).toErrorResponse());
        return;
      }
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      )
        .clone()
        .setToken(req.token);
      return next(err);
    }
  }
}
