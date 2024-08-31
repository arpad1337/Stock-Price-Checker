# Stock Price Checker API

## To run the API locally:

Create a `.env.compose` file as
```
NODE_ENV="development"
FINNHUB_API_TOKEN="...."
```

```
docker-compose up --build
```

## Endpoints

- GET `/common/status` for liveliness/readyness probes
- PUT `/api/v1/symbol/:symbol` to add a ticker to watch
- GET `/api/v1/symbol/:symbol` get prices by ticker

## Output Schema
```typescript
{
    "status": "ok",
    "data": {
        "currentPrice": number,
        "movingAverage": number,
        "lastCheckedAt": string
    },
    "correlationId": UUIDv4
}
```

## Copyright

The code is built upon `@greeneyesai/api-utils` package:
[https://www.npmjs.com/package/@greeneyesai/api-utils](https://www.npmjs.com/package/@greeneyesai/api-utils).

© Arpad Kiss <arpad@greeneyes.ai>