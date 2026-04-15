import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { PrismaClient } from '@prisma/client';

import { PrismaAdapter } from '../src/storage/prismaAdapter';
import { runStorageAdapterBehaviorTests } from './storageAdapter.behavior';

const initializeSqliteSchema = async (client: PrismaClient): Promise<void> => {
  const statements = [
    `CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "memorySummary" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
    `CREATE TABLE "Conversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Conversation_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId")`,
    `CREATE TABLE "Message" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_conversationId_fkey"
        FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX "Message_conversationId_createdAt_idx"
      ON "Message"("conversationId", "createdAt")`,
  ];

  for (const statement of statements) {
    await client.$executeRawUnsafe(statement);
  }
};

runStorageAdapterBehaviorTests('PrismaAdapter', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prisma-adapter-test-'));
  const dbPath = path.join(tempDir, 'test.db');
  const databaseUrl = `file:${dbPath}`;
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  await client.$connect();
  await initializeSqliteSchema(client);

  return {
    adapter: new PrismaAdapter(client),
    cleanup: async () => {
      await client.$disconnect();
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
});
