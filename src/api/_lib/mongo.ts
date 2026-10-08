import { MongoClient } from 'mongodb';
import type { ItemDoc } from '../../src/data/remoteModel.js';
import type { ItemsStore } from './http.js';

let clientPromise: Promise<MongoClient> | undefined;

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return Promise.reject(new Error('MONGODB_URI is not set'));
  // Reused across invocations of a warm serverless instance.
  clientPromise ??= new MongoClient(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 }).connect().catch((e) => {
    clientPromise = undefined;
    throw e;
  });
  return clientPromise;
}

export async function mongoStore(): Promise<ItemsStore> {
  const c = await client();
  const col = c.db(process.env.MONGODB_DB || 'betterarch').collection<ItemDoc>('items');
  return {
    async page(offset, limit) {
      return col.find({}).sort({ kind: 1, order: 1, _id: 1 }).skip(offset).limit(limit).toArray();
    },
    async apply(upserts, deletes) {
      const ops: any[] = [
        ...upserts.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
        ...deletes.map((id) => ({ deleteOne: { filter: { _id: id } } })),
      ];
      if (ops.length) await col.bulkWrite(ops, { ordered: false });
    },
  };
}
