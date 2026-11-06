import { Router } from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { create, findAll, findOne, update, deactivate } from '../controllers/book.controller';

const router = Router();

router.use(requireAuth); // everything below needs a logged-in user

router.get('/', findAll);
router.get('/:id', findOne);

router.post('/', requireLibrarian, create);
router.put('/:id', requireLibrarian, update);
router.delete('/:id', requireLibrarian, deactivate);

export default router;