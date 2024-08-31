import {
  SingletonClassType,
  DatabaseProvider,
  StoreProviderEvents,
  StoreProviderError,
  Provider,
  ModelStatic,
} from "@greeneyesai/api-utils";

export interface IDatabaseSynchronizerConfig extends Array<string> {}

export class DatabaseSynchronizer extends Provider<IDatabaseSynchronizerConfig> {
  static get Dependencies(): [SingletonClassType<DatabaseProvider>] {
    return [DatabaseProvider];
  }

  public constructor(protected _databaseProvider: DatabaseProvider) {
    super();
  }

  public configure(config: IDatabaseSynchronizerConfig) {
    super.configure(config);
    this._databaseProvider.once(StoreProviderEvents.Connected, () =>
      this.sync()
    );
  }

  public async sync(): Promise<void> {
    try {
      for (let modelPath of this._config!) {
        const CurrentModel: ModelStatic<any> =
          this._databaseProvider.getModelByName<ModelStatic<any>>(modelPath)!;
        await CurrentModel.sync();
        this._databaseProvider.logger?.debug(
          `${this.className}->sync() Model for table "${CurrentModel.tableName}" synced.`
        );
      }
    } catch (e) {
      const err = (
        e instanceof StoreProviderError
          ? e
          : StoreProviderError.createFromError(e as Error)
      ).clone();
      err.stack = `${this.className}->sync() Error: ${err.stack}`;
      this._databaseProvider.logger?.error(err);
    }
  }
}
