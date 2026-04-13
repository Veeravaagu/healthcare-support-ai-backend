import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { createUser } from '../services/chatService';
import { parseWithSchema } from '../utils/http';
import { createUserSchema } from '../validators/userValidators';

export const userRouter = Router();

userRouter.post('/', async (request, response, next) => {
  try {
    const input = parseWithSchema(createUserSchema, request.body);
    const user = await createUser(input);

    response.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

userRouter.get('/:userId', async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.params.userId },
    });

    if (!user) {
      response.status(404).json({ error: 'User not found.' });
      return;
    }

    response.json(user);
  } catch (error) {
    next(error);
  }
});
