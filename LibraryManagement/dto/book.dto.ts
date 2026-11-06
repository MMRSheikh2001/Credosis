import { Book } from '../models';
import { pickDefined } from '../utils/pickDefined';

// addedById is not accepted from the body. It comes from the logged-in librarian.
export function toBookRequestDTO(body: Record<string, any>) {
    return pickDefined(body, ['title', 'author', 'isbn', 'bookAmount', 'isActive']);
}

export function toBookResponseDTO(book: Book) {
    return {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        bookAmount: book.bookAmount,
        isActive: book.isActive,
        addedById: book.addedById,
    };
}