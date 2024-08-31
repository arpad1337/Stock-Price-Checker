/*
 * @rpi1337
 */

import {
  CacheProvider,
  CacheProviderWithProxiedClientType,
  Middleware,
  StoreProviderEvents,
} from "@greeneyesai/api-utils";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { NextFunction, Request, Response } from "express";

export interface IRateLimitingConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  prefix: string;
}

export class RateLimitingMiddleware extends Middleware {
  protected _store: RedisStore | undefined = undefined;
  protected _windowInMilisecsSelector: string | undefined = undefined;
  protected _maxRequestsSelector: string | undefined = undefined;

  protected get _defaultOpts() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
      prefix: "RateLimiting",
    };
  }

  public static create(opts = {}) {
    const cacheProvider = CacheProvider.instance;
    return new this(cacheProvider, opts);
  }

  protected constructor(
    protected _cacheProvider: CacheProviderWithProxiedClientType,
    protected _opts: Partial<IRateLimitingConfig> = {}
  ) {
    super();
    this._opts = Object.assign({}, this._defaultOpts, this._opts);
  }

  protected get store() {
    if (!this._store) {
      const cacheProvider = this._cacheProvider;
      this._store = new RedisStore({
        prefix: this._opts.prefix ? this._opts.prefix + ":" : undefined,
        sendCommand: async (...command: any[]) => {
          return (
            cacheProvider.respondsToSelector("sendCommand") &&
            cacheProvider.sendCommand!(command)
          );
        },
      });
    }
    return this._store;
  }

  public setWindowInMilisecsPropertySelector(selector: string) {
    this._windowInMilisecsSelector = selector;
    return this;
  }

  public setMaxRequestsPropertySelector(selector: string) {
    this._maxRequestsSelector = selector;
    return this;
  }

  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    let opts = Object.assign({}, this._opts);
    if (this._windowInMilisecsSelector) {
      opts = Object.assign(opts, {
        windowMs: Reflect.get(req, this._windowInMilisecsSelector),
      });
    }

    if (this._maxRequestsSelector) {
      opts = Object.assign(opts, {
        max: Reflect.get(req, this._maxRequestsSelector),
      });
    }

    if (this._cacheProvider.configured && !this._cacheProvider.connected) {
      await new Promise<void>((r) =>
        this._cacheProvider.once(StoreProviderEvents.Connected, () => r())
      );
    }

    rateLimit(
      Object.assign(opts, {
        store: this.store,
      })
    )(req, res, next);
  }
}
