import {
  Application,
  ApplicationEvents,
  ExecutionContext,
  ILoggerInstance,
  ProviderDefinitionType,
  IRouteFactory,
  StoreProvider,
  StoreProviderEvents,
} from "@greeneyesai/api-utils";
import { once } from "events";

export class StockPriceCheckerAPIApplication extends Application {
  public static get ApplicationName() {
    return "StockPriceCheckerAPI";
  }

  public ApplicationName() {
    return StockPriceCheckerAPIApplication.ApplicationName;
  }

  public allowCors(): this {
    this.app.disable('trust proxy');
    return super.allowCors();
  }

  public setLoggerInterface(loggerInstance: ILoggerInstance): this {
    return super
      .setLoggerInterface(loggerInstance)
      .bindHandlerToContextEvents(
        ["uncaughtException", "unhandledRejection"],
        (
          _app: StockPriceCheckerAPIApplication,
          _context: ExecutionContext,
          err: Error
        ) => {
          _app.logger?.error(err, {
            token: StockPriceCheckerAPIApplication.ApplicationName,
          });
        }
      )
      .once(ApplicationEvents.Closed, (_app: StockPriceCheckerAPIApplication) => {
        _app.getLoggerInterface()?.info(`Application closed.`, {
          token: StockPriceCheckerAPIApplication.ApplicationName,
        });
        _app.logger?.onExit && _app.logger?.onExit();
        !!_app.getContext() &&
          _app.getContext()!.exit &&
          _app.getContext()!.exit!();
      })
      .bindHandlerToContextEvents(
        ["SIGTERM", "SIGUSR2"],
        (_app: StockPriceCheckerAPIApplication) => {
          _app.logger?.debug(`Received SIGTERM...`, {
            token: StockPriceCheckerAPIApplication.ApplicationName,
          });
          _app.notify("sigtermFromOS").close();
        }
      )
      .disableApplicationSignature()
      .allowCors();
  }

  public mountRoutes(factory: IRouteFactory): this {
    return super
      .mountRoutes(factory)
      .addRouteNotFoundHandler()
      .addDefaultErrorHandler([
        "SequelizeDatabaseError",
        "DataCloneError",
        "connect ECONNREFUSED" /* Axios */,
        "StoreProviderError",
      ])
      .once(ApplicationEvents.Listening, (_app: StockPriceCheckerAPIApplication) => {
        _app.logger?.info(`Application launched on port ${_app.getPort()}.`, {
          token: StockPriceCheckerAPIApplication.ApplicationName,
        });
      });
  }

  public configureProviders(
    providers: ProviderDefinitionType<any, any>[]
  ): this {
    super.configureProviders(providers);
    (async (
      _app: StockPriceCheckerAPIApplication,
      _providers: ProviderDefinitionType<any, any>[]
    ) => {
      await Promise.all(
        _providers
          .filter(
            (providerDefinition: ProviderDefinitionType<any, any>): boolean =>
              providerDefinition.class.instance instanceof StoreProvider
          )
          .map(
            (
              providerDefinition: ProviderDefinitionType<
                StoreProvider<any>,
                any
              >
            ): Promise<void> =>
              once(
                providerDefinition.class.instance,
                StoreProviderEvents.Connected
              ) as unknown as Promise<void>
          )
      );
      _app.logger?.info(`Store providers connected.`, {
        token: StockPriceCheckerAPIApplication.ApplicationName,
      });
    })(this, providers);
    return this;
  }
}
