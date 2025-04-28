declare global {
    namespace NodeJS {
      interface Global {
        _mongoClientPromise?: Promise<MongoClient>;
      }
    }
  }
  
  export {};