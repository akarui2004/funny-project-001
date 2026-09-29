import { AbstractDataTypeConstructor, DataType, DataTypes, ModelAttributeColumnOptions, ModelAttributeColumnReferencesOptions } from 'sequelize'
import BigNumber from 'bignumber.js';

export const primaryKey = (dataType: DataType = DataTypes.UUID, options: Partial<ModelAttributeColumnOptions> = {}): ModelAttributeColumnOptions => ({
  type: dataType,
  primaryKey: true,
  allowNull: false,
  ...options,
});

export const uuid = (required: boolean = false, unique: boolean = false): ModelAttributeColumnOptions => ({
  type: DataTypes.UUID,
  allowNull: !required,
  unique,
})

export const genericString = (required: boolean = false, length: number = 255, defaultValue?: AbstractDataTypeConstructor): ModelAttributeColumnOptions => {
  return {
    type: DataTypes.STRING(length),
    allowNull: !required,
    defaultValue: defaultValue,
  }
};

export const text = (required: boolean = false): ModelAttributeColumnOptions => ({
  type: DataTypes.TEXT,
  allowNull: !required,
});

export const integer = (required: boolean = false, defaultValue?: number): ModelAttributeColumnOptions => ({
  type: DataTypes.INTEGER,
  allowNull: !required,
  defaultValue,
});

export const unsignedInteger = (required: boolean = false, defaultValue?: number): ModelAttributeColumnOptions => ({
  type: DataTypes.INTEGER.UNSIGNED,
  allowNull: !required,
  defaultValue,
});

export const bigInteger = (required: boolean = false, defaultValue?: bigint): ModelAttributeColumnOptions => ({
  type: DataTypes.BIGINT,
  allowNull: !required,
  defaultValue,
})

/**
 * p mean precision
 * s mean scale
*/
export const decimal = (required: boolean = false, p = 36, s = 18, defaultValue = 0): ModelAttributeColumnOptions => ({
  type: DataTypes.DECIMAL(p, s),
  allowNull: !required,
  defaultValue: BigNumber(defaultValue),
})

export const datetime = (required: boolean = false, defaultValue?: AbstractDataTypeConstructor): ModelAttributeColumnOptions => ({
  type: DataTypes.DATE,
  allowNull: !required,
  defaultValue,
});

export const date = (required: boolean = false, defaultValue?: AbstractDataTypeConstructor): ModelAttributeColumnOptions => ({
  type: DataTypes.DATEONLY,
  allowNull: !required,
  defaultValue,
});

export const enumType = (values: string[] = [], required: boolean = false, defaultValue?: string): ModelAttributeColumnOptions => ({
  type: DataTypes.ENUM(...values),
  allowNull: !required,
  defaultValue,
});

export const jsonType = (required: boolean = false): ModelAttributeColumnOptions => ({
  type: DataTypes.JSONB,
  allowNull: !required,
});

export const foreignKey = (
  refTable: string,
  refCol: string = 'id',
  required: boolean = false,
  type: DataType = DataTypes.UUID,
  onDelete: string | undefined,
  onUpdate: string | undefined
): ModelAttributeColumnOptions => ({
  type,
  allowNull: !required,
  onDelete,
  onUpdate,
  references: { model: refTable, key: refCol },
});

export const softDeleteColumns = {
  deletedAt: datetime()
}

export const timestampColumns = {
  createdAt: datetime(true),
  updatedAt: datetime(true),
}
