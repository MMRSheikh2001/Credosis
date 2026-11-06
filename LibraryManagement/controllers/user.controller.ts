import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { toUserRequestDTO, toUserResponseDTO } from '../dto/user.dto';

export async function register(req: Request, res: Response) {
    try {
        const data = toUserRequestDTO(req.body);

        if (!data.name || !data.email || !data.password) {
            res.status(400).json({ message: 'name, email and password are required.' });
            return;
        }

        const existing = await User.findOne({ where: { email: data.email } });
        if (existing) {
            res.status(409).json({ message: 'Email already registered.' });
            return;
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await User.create({
            name: data.name,
            email: data.email,
            password: passwordHash,
        });

        res.status(201).json(toUserResponseDTO(user));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}

export async function findAll(req: Request, res: Response) {
    try {
        const users = await User.findAll();
        res.json(users.map(toUserResponseDTO));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}

export async function findOne(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid id.' });
            return;
        }

        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        res.json(toUserResponseDTO(user));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
}