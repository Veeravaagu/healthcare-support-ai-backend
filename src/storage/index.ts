import { env } from '../config/env';
import { MongooseAdapter } from './mongooseAdapter';
import { PrismaAdapter } from './prismaAdapter';
import type { StorageAdapter } from './storageAdapter';

const createStorageAdapter = (): StorageAdapter => {
  if (env.STORAGE_BACKEND === 'mongodb') {
    return new MongooseAdapter();
  }

  return new PrismaAdapter();
};

let storageAdapter: StorageAdapter = createStorageAdapter();

export const getStorageAdapter = (): StorageAdapter => {
  return storageAdapter;
};

export const setStorageAdapter = (adapter: StorageAdapter): void => {
  storageAdapter = adapter;
};

export const connectStorage = async (): Promise<void> => {
  await storageAdapter.connect();
};

export const disconnectStorage = async (): Promise<void> => {
  await storageAdapter.disconnect();
};

export * from './storageAdapter';
