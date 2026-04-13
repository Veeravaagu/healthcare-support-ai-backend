import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';

import { apiRouter } from './routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_request, response) => {
  response.json({
    name: 'healthcare-support-ai-backend',
    message:
      'Memory-aware healthcare support chat backend. This service is non-diagnostic and not a substitute for professional medical advice.',
  });
});

app.use('/api', apiRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'Validation failed.',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof Error) {
    response.status(400).json({
      error: error.message,
    });
    return;
  }

  response.status(500).json({
    error: 'Unexpected server error.',
  });
});
