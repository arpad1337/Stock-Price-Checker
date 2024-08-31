import {
  IRoute,
  IRouteFactory,
  ILoggerInstance,
  ProviderDefinitionType,
  IDatabaseConfig,
  CacheProvider,
  ICacheConfig,
  LoggerAccessor,
  DatabaseProvider,
  CronProvider,
  ICronProviderConfig,
  ApplicationEvents,
  NativeMiddleware,
  Cryptography,
  ICryptographyConfig,
  LogLevel,
} from "@greeneyesai/api-utils";
import BodyParserMiddleware from "body-parser";
import { StockPriceCheckerAPIApplication } from "./lib/stock-price-checker-api";
import { CommonModule, PublicModule } from "./modules";
import { Config } from "./lib/config";
import {
  DatabaseSynchronizer,
  IDatabaseSynchronizerConfig,
} from "./lib/providers/database-synchronizer";

const logger: ILoggerInstance =
  Config.ApplicationConfig.ENV === "development"
    ? LoggerAccessor.setLogLevel(LogLevel.DEBUG).consoleLogger
    : LoggerAccessor.logger;

export function createApp(): StockPriceCheckerAPIApplication {
  try {
    const routeFactory: IRouteFactory = {
      create(): IRoute[] {
        const commonRoutes = CommonModule.createRoutes();
        const publicRoutes = PublicModule.createRoutes();
        logger.info(`Routes created successfully.`);
        return [...commonRoutes, ...publicRoutes];
      },
    };

    const databaseProviderDefinition: ProviderDefinitionType<
      DatabaseProvider,
      IDatabaseConfig
    > = {
      class: DatabaseProvider,
      config: Config.DatabaseConfig,
    };

    const cacheProviderDefinition: ProviderDefinitionType<
      CacheProvider,
      ICacheConfig
    > = {
      class: CacheProvider,
      config: Config.CacheConfig,
    };

    const cronProviderDefinition: ProviderDefinitionType<
      CronProvider,
      ICronProviderConfig
    > = {
      class: CronProvider,
      config: [PublicModule.PeriodicalStockPriceFetcherCronJob],
    };

    const cryptographyDefinition: ProviderDefinitionType<
      Cryptography,
      ICryptographyConfig
    > = {
      class: Cryptography,
      config: Config.EncryptionConfig,
    };

    const databaseSynchronizerDefinition: ProviderDefinitionType<
      DatabaseSynchronizer,
      IDatabaseSynchronizerConfig
    > = {
      class: DatabaseSynchronizer,
      config: ["stock-to-watch", "stock-price"],
    };

    const providers: ProviderDefinitionType<any, any>[] = [
      databaseProviderDefinition,
      cacheProviderDefinition,
      cronProviderDefinition,
      cryptographyDefinition,
      databaseSynchronizerDefinition,
    ];

    const bodyParserMiddleware: NativeMiddleware = BodyParserMiddleware.json({
      limit: "1mb",
    });

    logger.info(
      `[START] Running release version "${Config.ApplicationConfig.commitSHA}"`,
      {
        token: StockPriceCheckerAPIApplication.ApplicationName,
      }
    );

    const app: StockPriceCheckerAPIApplication =
      new StockPriceCheckerAPIApplication(Config.ApplicationConfig.port)
        .attachToContext(process)
        .setLoggerInterface(logger)
        .addNativeMiddleware(bodyParserMiddleware);

    if (!process.env.CI) {
      app.configureProviders(providers);
    } else {
      cryptographyDefinition.class.instance.configure(Config.EncryptionConfig);
    }

    app
      .mountRoutes(routeFactory)
      .once(
        ApplicationEvents.Closing,
        (_app: StockPriceCheckerAPIApplication) => {
          logger.info(
            `[END] Terminating release version "${Config.ApplicationConfig.commitSHA}"`,
            {
              token: StockPriceCheckerAPIApplication.ApplicationName,
            }
          );
        }
      );
    return app;
  } catch (e) {
    throw e;
  }
}

export async function main() {
  try {
    const app = createApp();
    await app.listen();
  } catch (e) {
    logger.error(e, () => process.exit(1));
  }
}
