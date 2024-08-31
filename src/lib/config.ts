import {
  ApplicationError,
  ICacheConfig,
  ICryptographyConfig,
  IDatabaseConfig,
} from "@greeneyesai/api-utils";
import path from "path";

export type ConfigType = {
  DatabaseConfig: IDatabaseConfig;
  CacheConfig: ICacheConfig;
  EncryptionConfig: ICryptographyConfig;
  ApplicationConfig: {
    port: number;
    commitSHA: string;
    ENV: "development" | "production";
  };
};

export function getenv<T = string>(key: string): T {
  if (!!process.env.CI) {
    return "_DUMMY_" as T;
  }
  if (!!process.env[key]) {
    return process.env[key]! as T;
  }
  const e = new ApplicationError(`process.env.${key} not defined`).setToken(
    process.env.CI_COMMIT_SHORT_SHA
  );
  throw e;
}

(function testStoreProviderEnvs(keys: string[]): void {
  for (let k of keys) {
    getenv(k);
  }
})([
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_DATABASE",
  "REDIS_HOST",
  "REDIS_PORT",
]);

export const Config: ConfigType = {
  DatabaseConfig: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT!),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_DATABASE!,
    ssl: getenv("NODE_ENV") === "production",
    modelsPath: path.resolve(__dirname, "./models"),
  },
  CacheConfig: {
    url: `${getenv("NODE_ENV") === "production" ? "rediss" : "redis"}://${
      process.env.REDIS_HOST
    }:${process.env.REDIS_PORT}/1`,
    auth: process.env.REDIS_AUTH || "",
  },
  EncryptionConfig: {
    passwordSalt: process.env.PASSWORD_SALT || "password_salt",
    passwordSaltInTransmit: process.env.PASSWORD_IN_TRANSMIT_SALT || "password_in_transmit_salt",
    adapterLockSalt: process.env.ADAPTER_LOCK_SALT || "adapter_lock_salt",
  },
  ApplicationConfig: {
    port: !!process.env.PORT ? Number(process.env.PORT) : 8100,
    commitSHA: getenv("CI_COMMIT_SHORT_SHA"),
    ENV: getenv("NODE_ENV"),
  },
};
