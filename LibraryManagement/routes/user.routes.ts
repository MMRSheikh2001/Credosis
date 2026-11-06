import { Router } from 'express';
import { register, findAll, findOne } from '../controllers/user.controller';

const router = Router();

router.post('/register', register);
router.get('/', findAll);
router.get('/:id', findOne);

export default router;