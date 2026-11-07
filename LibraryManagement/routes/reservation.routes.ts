import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    create,
    findAll,
    findOne,
    updateStatus,
} from '../controllers/reservation.controller';

const router = Router();

router.use(requireAuth);

router.post('/', create);
router.get('/', findAll);
router.get('/:id', findOne);
router.patch('/:id/status', updateStatus);

export default router;