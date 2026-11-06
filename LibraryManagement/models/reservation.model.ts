import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database';

export enum ReservationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    RETURNED = 'RETURNED',
}

export class Reservation extends Model<
    InferAttributes<Reservation>,
    InferCreationAttributes<Reservation>
> {
    declare id: CreationOptional<number>;
    declare userId: number;
    declare bookId: number;
    declare status: CreationOptional<ReservationStatus>;
}

Reservation.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        bookId: { type: DataTypes.INTEGER, allowNull: false },
        status: {
            type: DataTypes.ENUM(...Object.values(ReservationStatus)),
            allowNull: false,
            defaultValue: ReservationStatus.PENDING,
        },
    },
    { sequelize, tableName: 'reservations' }
);