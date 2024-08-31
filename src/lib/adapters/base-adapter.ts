import {
  CacheProvider,
  CacheProviderWithProxiedClientType,
  Cryptography,
  ErrorLike,
  Singleton,
  SingletonClassType,
  SingletonError,
} from "@greeneyesai/api-utils";
import { AxiosError, AxiosInstance } from "axios";

export class AdapterError extends SingletonError {}

export abstract class BaseAdapter extends Singleton {
  public static get Dependencies(): [
    SingletonClassType<CacheProvider>,
    SingletonClassType<Cryptography>
  ] {
    return [CacheProvider, Cryptography];
  }

  public static create(
    cacheProvider: CacheProviderWithProxiedClientType,
    cryptography: Cryptography
  ): BaseAdapter {
    throw new AdapterError(`${this.className}::create Must override`);
  }

  public constructor(
    protected _cacheProvider: CacheProviderWithProxiedClientType,
    protected _cryptography: Cryptography,
    protected _httpClient: AxiosInstance
  ) {
    super();
    this._httpClient.interceptors.request.use((config) => {
      this.logger?.info(
        `[${config.method!.toUpperCase()}] ${config.baseURL}${config.url} ...`,
        { token: config.headers["X-Correlation-Id"] }
      );
      return config;
    });
    this._httpClient.interceptors.response.use(
      (response) => {
        this.logger?.info(
          `[${response.config.method!.toUpperCase()}] ${
            response.config.baseURL
          }${response.config.url} ${response.status}`,
          { token: response.config.headers["X-Correlation-Id"] }
        );
        return response;
      },
      (error) => {
        if (!!error.response) {
          this.logger?.info(
            `[${error.config.method.toUpperCase()}] ${`${error.config.baseURL}${error.config.url}`} ${
              error.response.status
            }: ${error.response.data.message || error.response.data.error}`,
            { token: error.config.headers["X-Correlation-Id"] }
          );
        } else {
          this.logger?.info(
            `[${error.config.method.toUpperCase()}] ${`${error.config.baseURL}${error.config.url}`} ${500}: ${
              error.message
            }`,
            { token: error.config.headers["X-Correlation-Id"] }
          );
        }
        return Promise.reject(error);
      }
    );
  }

  protected get CachePrefix(): string {
    return `AdapterRemoteCallLock:${this.className}`;
  }

  protected createCacheLockKey(method: string, token: string) {
    return `${this.CachePrefix}:${method}:${token}`;
  }

  protected getBoundMethod<
    T extends string,
    U extends (...args: any[]) => Promise<any | void>
  >(method: T, correlationId: string, ...args: any[]): U {
    if (this.respondsToSelector(method)) {
      return (Reflect.get(this, method) as Function).bind(
        this,
        correlationId,
        ...args
      ) as U;
    }
    throw new AdapterError(
      `${this.className}->getBoundMethod Instance not responding to selector "${method}"`
    );
  }

  public wrappedAPICall<
    T extends this,
    U extends string & keyof T,
    K extends T[U] & ((...args: any[]) => Promise<any | void>)
  >(
    correlationId: string,
    method: U,
    token: string,
    ...args: any[]
  ): () => Promise<undefined | ReturnType<K>> {
    const wrappedMethod: K = this.getBoundMethod(
      method,
      correlationId,
      ...args
    );
    return async (): Promise<undefined | ReturnType<K>> => {
      const tokenHash = this._cryptography.hashWithCustomSalt(
        token,
        this._cryptography.config!.adapterLockSalt!
      );
      if (
        this._cacheProvider.respondsToSelector("get") &&
        (await this._cacheProvider.get!(
          this.createCacheLockKey(method, tokenHash)
        ))
      ) {
        this._cacheProvider.respondsToSelector("expire") &&
          this._cacheProvider.expire!(
            this.createCacheLockKey(method, tokenHash),
            60
          );
        throw this.createErrorFromAxiosErrorResponse(
          new AdapterError(`Call ${method} in progress`),
          correlationId,
          {
            args,
          }
        );
      }
      this._cacheProvider.respondsToSelector("set") &&
        (await this._cacheProvider.set!(
          this.createCacheLockKey(method, tokenHash),
          "true"
        ));
      this._cacheProvider.respondsToSelector("expire") &&
        this._cacheProvider.expire!(
          this.createCacheLockKey(method, tokenHash),
          60
        );
      let result: ReturnType<K>;
      try {
        result = await wrappedMethod();
      } catch (e) {
        throw e;
      } finally {
        this._cacheProvider.respondsToSelector("del") &&
          (await this._cacheProvider.del!(
            this.createCacheLockKey(method, tokenHash)
          ));
      }
      return result;
    };
  }

  protected createErrorFromAxiosErrorResponse(
    e: ErrorLike,
    correlationId: string,
    meta: Object = {}
  ): AdapterError {
    return new AdapterError(
      e instanceof AxiosError
        ? (e.response && (e.response.data.message || e.response.data.error)) ||
          "Unknown error"
        : (e as Error).message
    )
      .setContext(this.context)
      .setOriginator(this)
      .setMetadata(meta)
      .setToken(correlationId);
  }
}
