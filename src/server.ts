import http from 'http';

import { app } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { registerSocketServer } from './socket';

const server = http.createServer(app);

registerSocketServer(server);

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();

    server.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server.', error);
    process.exit(1);
  }
};

void start();

const shutdown = async (): Promise<void> => {
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
