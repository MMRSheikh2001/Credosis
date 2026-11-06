import { Request, Response } from 'express';
import { Book, User } from '../models';
import { toBookRequestDTO, toBookResponseDTO } from '../dto/book.dto';

function isValidAmount(value: unknown): boolean {
    return Number.isInteger(value) && (value as number) >= 0;
}

export async function create(req: Request, res: Response) {
    try {
        const librarian = res.locals.user as User;
        const data = toBookRequestDTO(req.body);

        if (!data.title || !data.author) {
            res.status(400).json({ message: 'title and author are required.' });
            return;
        }
        if (data.bookAmount !== undefined && !isValidAmount(data.bookAmount)) {
            res.status(400).json({ message: 'bookAmount must be a whole number, 0 or more.' });
            return;
        }
        if (data.isbn) {
            const existing = await Book.findOne({ where: { isbn: data.isbn } });
            if (existing) {
                res.status(409).json({ message: 'A book with this ISBN already exists.' });
                return;
            }
        }

        const book = await Book.create({
            title: data.title,
            author: data.author,
            isbn: data.isbn ?? null,
            bookAmount: data.bookAmount,
            isActive: data.isActive,
            addedById: librarian.id,
        });

        res.status(201).json(toBookResponseDTO(book));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}

export async function findAll(req: Request, res: Response) {
    try {
        const user = res.locals.user as User;
        // Members only see active books. Librarians see everything.
        const books = await Book.findAll({
            where: user.isLibrarian ? {} : { isActive: true },
        });
        res.json(books.map(toBookResponseDTO));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
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

        const book = await Book.findByPk(id);
        if (!book || (!book.isActive && !user.isLibrarian)) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        res.json(toBookResponseDTO(book));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}

export async function update(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid id.' });
            return;
        }

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        const data = toBookRequestDTO(req.body);
        if (data.bookAmount !== undefined && !isValidAmount(data.bookAmount)) {
            res.status(400).json({ message: 'bookAmount must be a whole number, 0 or more.' });
            return;
        }

        await book.update(data);
        res.json(toBookResponseDTO(book));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}

// DELETE deactivates instead of removing the row, so reservations stay valid.
export async function deactivate(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid id.' });
            return;
        }

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        await book.update({ isActive: false });
        res.json(toBookResponseDTO(book));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}