import {
  DatabaseProvider,
  IWorkerFactory,
  IWorkerConfig,
  SingletonClassType,
  Worker,
  WorkerError,
  StoreProviderEvents,
  StoreProviderError,
  IDatabaseConfig,
} from "@greeneyesai/api-utils";
import {
  StockToWatchModelType,
  StockToWatchModelTypeStatic,
} from "../../../lib/models/stock-to-watch";
import { FinnhubAdapter } from "../adapters/finnhub";
import { StockPriceModelTypeStatic } from "../../../lib/models/stock-price";

export type StockPriceFetcherWorkerResultType = boolean;

export interface IStockPriceFetcherWorkerConfig extends IWorkerConfig {
  databaseConfig: IDatabaseConfig;
}

export class StockPriceFetcherWorker extends Worker<
  StockPriceFetcherWorkerResultType,
  IStockPriceFetcherWorkerConfig
> {
  protected static getCurrentFilePath() {
    return super.resolve(__dirname, __filename);
  }

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

  public configure(config: IStockPriceFetcherWorkerConfig): void {
    super.configure(config);
    if (!this._databaseProvider.configured) {
      this._databaseProvider.configure(this._config!.databaseConfig);
      this._databaseProvider.connect();
    }
  }

  public async run(): Promise<StockPriceFetcherWorkerResultType> {
    if (!this._databaseProvider.configured) {
      throw new WorkerError(
        `${this.className}->run DatabaseProvider not configured`
      );
    }

    if (!this._databaseProvider.connected) {
      await new Promise<void>((r) =>
        this._databaseProvider.once(StoreProviderEvents.Connected, () => r())
      );
    }

    this.logger?.debug(`${this.className}->run Querying stocks`, {
      token: this.token,
    });

    let stocks: StockToWatchModelType[] = [];
    try {
      const StockToWatchModel: StockToWatchModelTypeStatic =
        this._databaseProvider.getModelByName<StockToWatchModelTypeStatic>(
          "stock-to-watch"
        )!;

      const StockPrice: StockPriceModelTypeStatic =
        this._databaseProvider.getModelByName<StockPriceModelTypeStatic>(
          "stock-price"
        )!;

      stocks = await StockToWatchModel.findAll();

      for (let stock of stocks) {
        await this.wait(); // debouncing due to rate limit
        try {
          const { currentPrice } = await this._finnhubAdapter.getPriceForTicker(
            this.token!,
            stock.get("ticker") as string
          );
          await StockPrice.createWithStockToWatchObjectIdAndPrice(
            stock.get("objectId") as number,
            currentPrice
          );
        } catch (e) {
          this.logger?.error(e, {
            token: this.token,
          });
        }
      }
    } catch (e) {
      const err = (
        e instanceof StoreProviderError
          ? e
          : StoreProviderError.createFromError(e as Error)
      ).clone();
      throw err;
    } finally {
      await this._databaseProvider.disconnect();
    }

    return true;
  }

  protected wait(divider = 30): Promise<void> {
    return new Promise((r) => {
      setTimeout(() => r(), 1000 / divider);
    });
  }
}

export const StockPriceFetcherWorkerFactory: IWorkerFactory<
  StockPriceFetcherWorkerResultType,
  IStockPriceFetcherWorkerConfig
> = StockPriceFetcherWorker.getWorkerFactory<
  StockPriceFetcherWorkerResultType,
  IStockPriceFetcherWorkerConfig
>();
