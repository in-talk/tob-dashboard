import { MongoClient } from 'mongodb';

const uri = process.env.DATABASE_URL as string;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true, // Ensure retryWrites is explicitly set
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient>;
  }
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the MongoDB client instance across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, it's safe to use a new MongoClient instance
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;