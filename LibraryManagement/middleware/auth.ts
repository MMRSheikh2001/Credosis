import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

// DEV ONLY placeholder. Replace the body with your real login/JWT check.
// Contract: on success put the User into res.locals.user and call next().
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.header('x-user-id'));
        const user = Number.isNaN(id) ? null : await User.findByPk(id);

        if (!user) {
            res.status(401).json({ message: 'Login required.' });
            return;
        }

        res.locals.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export function requireLibrarian(req: Request, res: Response, next: NextFunction) {
    const user = res.locals.user as User | undefined;

    if (!user?.isLibrarian) {
        res.status(403).json({ message: 'Librarian access only.' });
        return;
    }

    next();
}