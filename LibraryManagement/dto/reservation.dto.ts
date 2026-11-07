import { Reservation } from '../models';
import { pickDefined } from '../utils/pickDefined';

// userId and status are never taken from the create body.
// userId = logged-in user, status starts as PENDING.
export function toReservationRequestDTO(body: Record<string, any>) {
    return pickDefined(body, ['bookId']);
}

export function toReservationResponseDTO(reservation: Reservation) {
    return {
        id: reservation.id,
        userId: reservation.userId,
        bookId: reservation.bookId,
        status: reservation.status,
    };
}