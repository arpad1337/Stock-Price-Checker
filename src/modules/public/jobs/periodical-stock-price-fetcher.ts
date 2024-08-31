import { CronJob, WorkerError, WorkerInstance } from "@greeneyesai/api-utils";
import { Config } from "../../../lib/config";
import {
  IStockPriceFetcherWorkerConfig,
  StockPriceFetcherWorkerFactory,
  StockPriceFetcherWorkerResultType,
} from "../workers/stock-price-fetcher";

export class PeriodicalStockPriceFetcherCronJob extends CronJob {
  public static get ScheduledFor(): string {
    return `* * * * *`;
  }

  public async run(): Promise<void> {
    try {
      const config: IStockPriceFetcherWorkerConfig = {
        token: this.token,
        debug: Config.ApplicationConfig.ENV === "development",
        databaseConfig: Config.DatabaseConfig,
      };
      const worker: WorkerInstance<StockPriceFetcherWorkerResultType> =
        StockPriceFetcherWorkerFactory.createAndRunWorker(
          config,
          this.context,
          Config.ApplicationConfig.ENV === "development"
            ? ["-r", "ts-node/register/transpile-only"] // for `ts-node` to work
            : []
        );
      this.logger?.info(`Worker launched with token ${worker.token}`, {
        token: worker.token,
      });
      const result: StockPriceFetcherWorkerResultType =
        await worker.getResult();
      this.logger?.info(`Result: ${JSON.stringify(result, null, 2)}`, {
        token: worker.token,
      });
    } catch (e) {
      const err = (
        e instanceof WorkerError ? e : WorkerError.createFromError(e as Error)
      ).clone();
      err.stack = `Error thrown during worker execution: ${err.stack}`;
      this.logger?.error(err);
    }
  }
}
