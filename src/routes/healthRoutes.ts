import { Router } from 'express';

export const healthRouter = Router();

export const getHealth = (_request: unknown, response: { json: (body: { ok: true }) => void }): void => {
  response.json({ ok: true });
};

healthRouter.get('/', getHealth);
