import { BIGINT, REAL } from "sequelize";
import {
  DatabaseModelError,
  IParanoidAttributes,
  ITimestampsAttributes,
  Model,
  ModelStatic,
  ISchema,
  ModelTraitStatic,
  DatabaseProvider,
  ModelDefinition,
  DatabaseModelHelper,
} from "@greeneyesai/api-utils";

export class StockPriceModelError extends DatabaseModelError<StockPriceModelTypeStatic> {}

export const TABLE_NAME = "stock_price";

export const TABLE_FIELDS = {
  objectId: {
    field: "object_id",
    type: BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  stockId: {
    field: "stock_id",
    type: BIGINT,
    allowNull: false,
  },
  price: {
    type: REAL,
    allowNull: false,
  },
};

export interface IStockPrice
  extends ISchema,
    IParanoidAttributes,
    ITimestampsAttributes {
  objectId?: number;
  stockId: number;
  price: number;
}

export type StaticHelpersTraitType = ModelTraitStatic<
  IStockPrice,
  {
    createWithStockToWatchObjectIdAndPrice(
      this: StockPriceModelTypeStatic,
      stockId: number,
      price: number
    ): Promise<StockPriceModelType>;
  }
>;

export type StockPriceModelType = Model<IStockPrice>;

export type StockPriceModelTypeStatic = ModelStatic<StockPriceModelType> &
  StaticHelpersTraitType;

export const StaticHelpersTrait: StaticHelpersTraitType = {
  createWithStockToWatchObjectIdAndPrice: async function (
    stockId: number,
    price: number
  ): Promise<StockPriceModelType> {
    return this.create({
      stockId,
      price,
    });
  },
};

export function factory(
  databaseProvider: DatabaseProvider
): StockPriceModelTypeStatic {
  const model: ModelDefinition = DatabaseModelHelper.buildModel(
    // Table name
    TABLE_NAME,
    // Schema
    TABLE_FIELDS,
    // Traits
    [
      DatabaseModelHelper.PARANOID_MODEL_SETTINGS, // deletedAt
      DatabaseModelHelper.TIMESTAMPS_SETTINGS, // createdAt / updatedAt
    ]
  );

  const StockPriceModel: ModelStatic<Model<IStockPrice>> =
    databaseProvider.connection!.define(
      "StockPrice",
      model.schema,
      model.settings
    );

  DatabaseModelHelper.attachTraitToModelStatic(
    StockPriceModel,
    StaticHelpersTrait
  );

  return StockPriceModel as StockPriceModelTypeStatic;
}
