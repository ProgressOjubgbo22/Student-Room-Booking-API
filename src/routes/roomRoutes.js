import { Router } from 'express';
import { createRoom, listRooms, getRoom, updateRoom } from '../controllers/roomController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.validator.js';
import { createRoomSchema, updateRoomSchema, listRoomsQuery } from '../validators/room.validator.js';

const router = Router();
router.post('/', authenticate, authorize('admin'), validate(createRoomSchema), createRoom);
router.get('/', validate(listRoomsQuery, 'query'), listRooms);
router.get('/:id', validate(idParam, 'params'), getRoom);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(idParam, 'params'),
  validate(updateRoomSchema),
  updateRoom
);
export default router;
