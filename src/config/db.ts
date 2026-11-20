import { MongoClient, Db, Collection } from 'mongodb';
import { ENV } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) return db;

  if (!ENV.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  client = new MongoClient(ENV.MONGODB_URI);
  await client.connect();
  db = client.db(ENV.DB_NAME);
  console.log(`[MongoDB] Connected successfully to database: ${ENV.DB_NAME}`);
  return db;
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

export const getCollections = () => {
  const database = getDB();
  return {
    users: database.collection('users'),
    tuitions: database.collection('tuitions'),
    applications: database.collection('applications'),
    payments: database.collection('payments')
  };
};

export const closeDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed.');
  }
};
