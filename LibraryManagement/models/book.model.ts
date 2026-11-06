import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database';

export class Book extends Model<
    InferAttributes<Book>,
    InferCreationAttributes<Book>
> {
    declare id: CreationOptional<number>;
    declare title: string;
    declare author: string;
    declare isbn: string | null;
    declare bookAmount: CreationOptional<number>;
    declare isActive: CreationOptional<boolean>;
    declare addedById: number; // the librarian who added it
}

Book.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        author: { type: DataTypes.STRING, allowNull: false },
        isbn: { type: DataTypes.STRING, allowNull: true, unique: true },
        bookAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        addedById: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: 'books' }
);