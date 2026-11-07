import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Book, Reservation, User } from '../models';
import { ReservationStatus } from '../models/reservation.model';
import {
    toReservationRequestDTO,
    toReservationResponseDTO,
} from '../dto/reservation.dto';
import { HttpError } from '../utils/httpError';

const OPEN_STATUSES = [ReservationStatus.PENDING, ReservationStatus.APPROVED];

// These statuses give the copy back to the shelf.
const RELEASING_STATUSES = [
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
    ReservationStatus.RETURNED,
];

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
    [ReservationStatus.PENDING]: [
        ReservationStatus.APPROVED,
        ReservationStatus.REJECTED,
        ReservationStatus.CANCELLED,
    ],
    [ReservationStatus.APPROVED]: [
        ReservationStatus.RETURNED,
        ReservationStatus.CANCELLED,
    ],
    [ReservationStatus.REJECTED]: [],
    [ReservationStatus.CANCELLED]: [],
    [ReservationStatus.RETURNED]: [],
};

function handleError(error: unknown, res: Response) {
    if (error instanceof HttpError) {
        res.status(error.status).json({ message: error.message });
        return;
    }
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
}

export async function create(req: Request, res: Response) {
    try {
        const user = res.locals.user as User;
        const bookId = Number(toReservationRequestDTO(req.body).bookId);

        if (!Number.isInteger(bookId)) {
            res.status(400).json({ message: 'bookId is required.' });
            return;
        }

        const book = await Book.findByPk(bookId);
        if (!book || !book.isActive) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        const alreadyOpen = await Reservation.findOne({
            where: { userId: user.id, bookId, status: { [Op.in]: OPEN_STATUSES } },
        });
        if (alreadyOpen) {
            res.status(409).json({ message: 'You already have an open reservation for this book.' });
            return;
        }

        const reservation = await sequelize.transaction(async (t) => {
            // Take one copy only if the book is active and in stock.
            const [taken] = await Book.update(
                { bookAmount: sequelize.literal('bookAmount - 1') as any },
                {
                    where: { id: bookId, isActive: true, bookAmount: { [Op.gt]: 0 } },
                    transaction: t,
                }
            );
            if (taken === 0) {
                throw new HttpError(409, 'No copies available.');
            }

            return Reservation.create({ userId: user.id, bookId }, { transaction: t });
        });

        res.status(201).json(toReservationResponseDTO(reservation));
    } catch (error) {
        handleError(error, res);
    }
}

export async function findAll(req: Request, res: Response) {
    try {
        const user = res.locals.user as User;
        // Librarians see everything. Members see only their own.
        const reservations = await Reservation.findAll({
            where: user.isLibrarian ? {} : { userId: user.id },
            order: [['id', 'DESC']],
        });
        res.json(reservations.map(toReservationResponseDTO));
    } catch (error) {
        handleError(error, res);
    }
}

export async function findOne(req: Request, res: Response) {
    try {
        const user = res.locals.user as User;
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid id.' });
            return;
        }

        const reservation = await Reservation.findByPk(id);
        // 404 (not 403) for other people's reservations, so ids don't leak.
        if (!reservation || (!user.isLibrarian && reservation.userId !== user.id)) {
            res.status(404).json({ message: 'Reservation not found.' });
            return;
        }

        res.json(toReservationResponseDTO(reservation));
    } catch (error) {
        handleError(error, res);
    }
}

export async function updateStatus(req: Request, res: Response) {
    try {
        const user = res.locals.user as User;
        const id = Number(req.params.id);
        const next = req.body.status as ReservationStatus;

        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid id.' });
            return;
        }
        if (!Object.values(ReservationStatus).includes(next)) {
            res.status(400).json({
                message: `status must be one of: ${Object.values(ReservationStatus).join(', ')}.`,
            });
            return;
        }

        const reservation = await Reservation.findByPk(id);
        if (!reservation || (!user.isLibrarian && reservation.userId !== user.id)) {
            res.status(404).json({ message: 'Reservation not found.' });
            return;
        }

        const current = reservation.status;

        // Members may only cancel their own PENDING reservation.
        if (
            !user.isLibrarian &&
            (next !== ReservationStatus.CANCELLED || current !== ReservationStatus.PENDING)
        ) {
            res.status(403).json({ message: 'You can only cancel your own pending reservation.' });
            return;
        }

        if (!ALLOWED_TRANSITIONS[current].includes(next)) {
            res.status(409).json({ message: `Cannot change ${current} to ${next}.` });
            return;
        }

        await sequelize.transaction(async (t) => {
            // Only update if the status is still what we read. Stops double-releasing a copy.
            const [changed] = await Reservation.update(
                { status: next },
                { where: { id, status: current }, transaction: t }
            );
            if (changed === 0) {
                throw new HttpError(409, 'Reservation was just changed. Reload and try again.');
            }

            if (RELEASING_STATUSES.includes(next)) {
                await Book.update(
                    { bookAmount: sequelize.literal('bookAmount + 1') as any },
                    { where: { id: reservation.bookId }, transaction: t }
                );
            }
        });

        await reservation.reload();
        res.json(toReservationResponseDTO(reservation));
    } catch (error) {
        handleError(error, res);
    }
}