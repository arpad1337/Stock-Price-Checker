import { BIGINT, STRING } from "sequelize";
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
  ModelTrait,
} from "@greeneyesai/api-utils";
import { v4 } from "uuid";

export class StockToWatchModelError extends DatabaseModelError<StockToWatchModelTypeStatic> {}

export const TABLE_NAME = "stock_to_watch";

export const TABLE_FIELDS = {
  objectId: {
    field: "object_id",
    type: BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  id: {
    type: STRING(36),
    allowNull: false,
    validate: {
      isUUID: 4,
    },
  },
  ticker: {
    type: STRING(5),
    allowNull: false,
    unique: true,
  },
};

export interface IStockToWatch
  extends ISchema,
    IParanoidAttributes,
    ITimestampsAttributes {
  objectId?: number;
  id: string;
  ticker: string;
}

export interface IStockToWatchPublicView {
  id: string;
  ticker: string;
}

export type ViewsTraitType = ModelTrait<
  IStockToWatch,
  {
    getPublicView(): IStockToWatchPublicView;
  }
>;

export type StaticHelpersTraitType = ModelTraitStatic<
  IStockToWatch,
  {
    createWithTicker(
      this: StockToWatchModelTypeStatic,
      ticker: string
    ): Promise<StockToWatchModelType>;
  }
>;

export type StockToWatchModelType = Model<IStockToWatch>;

export type StockToWatchModelTypeStatic = ModelStatic<StockToWatchModelType> &
  StaticHelpersTraitType;

export const ViewsTrait: ViewsTraitType = {
  getPublicView: function (): IStockToWatchPublicView {
    const json = DatabaseModelHelper.PATCHED_GETTER(this);
    delete json.objectId;
    delete json.deletedAt;
    return json;
  },
};

export const StaticHelpersTrait: StaticHelpersTraitType = {
  createWithTicker: async function (
    ticker: string
  ): Promise<StockToWatchModelType> {
    return this.create({
      id: v4(),
      ticker,
    });
  },
};

export function factory(
  databaseProvider: DatabaseProvider
): StockToWatchModelTypeStatic {
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

  const StockToWatchModel: ModelStatic<Model<IStockToWatch>> =
    databaseProvider.connection!.define(
      "StockToWatch",
      model.schema,
      model.settings
    );

  DatabaseModelHelper.attachTraitToModel(StockToWatchModel, ViewsTrait);

  DatabaseModelHelper.attachTraitToModelStatic(
    StockToWatchModel,
    StaticHelpersTrait
  );

  return StockToWatchModel as StockToWatchModelTypeStatic;
}
