import { MongoMemoryServer } from 'mongodb-memory-server';

import { MongooseAdapter } from '../src/storage/mongooseAdapter';
import { runStorageAdapterBehaviorTests } from './storageAdapter.behavior';

runStorageAdapterBehaviorTests('MongooseAdapter', async () => {
  const server = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 47017,
    },
  });
  const adapter = new MongooseAdapter(server.getUri());

  return {
    adapter,
    cleanup: async () => {
      await adapter.disconnect();
      await server.stop();
    },
  };
});
