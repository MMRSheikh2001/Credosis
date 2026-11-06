import { User } from './user.model';
import { Book } from './book.model';
import { Reservation } from './reservation.model';

User.hasMany(Book, { foreignKey: 'addedById', as: 'addedBooks' });
Book.belongsTo(User, { foreignKey: 'addedById', as: 'addedBy' });

User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Book.hasMany(Reservation, { foreignKey: 'bookId', as: 'reservations' });
Reservation.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

export { User, Book, Reservation };