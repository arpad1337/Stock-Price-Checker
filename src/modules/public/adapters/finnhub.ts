import {
  CacheProviderWithProxiedClientType,
  Cryptography,
  ErrorLike,
} from "@greeneyesai/api-utils";
import { AdapterError, BaseAdapter } from "../../../lib/adapters/base-adapter";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getenv } from "../../../lib/config";

export class FinnhubAdapter extends BaseAdapter {
  public static create(
    cacheProvider: CacheProviderWithProxiedClientType,
    cryptography: Cryptography
  ): FinnhubAdapter {
    const httpClient: AxiosInstance = axios.create({
      baseURL: "https://finnhub.io/api/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Finnhub-Token": getenv("FINNHUB_API_TOKEN"),
      },
    });
    const instance: FinnhubAdapter = new this(
      cacheProvider,
      cryptography,
      httpClient
    );
    return instance;
  }

  public async getPriceForTicker(
    correlationId: string,
    ticker: string
  ): Promise<{ currentPrice: number }> {
    try {
      const { data }: { data: { c: number } } = await this._httpClient.get(
        `/quote?symbol=${ticker}`,
        {
          headers: {
            "X-Correlation-Id": correlationId,
          },
        }
      );

      if (data.c === 0) {
        throw new AdapterError(`Symbol ${ticker} has no price`);
      }

      return {
        currentPrice: data.c,
      };
    } catch (e) {
      const err =
        e instanceof AxiosError
          ? new ErrorLike((e as AxiosError)!.response!.data!["error"] as string)
          : ErrorLike.createFromError(e as Error);
      throw this.createErrorFromAxiosErrorResponse(err, correlationId, {
        ticker,
      });
    }
  }
}
