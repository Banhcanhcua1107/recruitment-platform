import "server-only";

import { MongoClient, type Db } from "mongodb";
import { getMongoDbName, getMongoDbUri } from "@/lib/email-testing/config";

declare global {
  var __emailTestingMongoPromise: Promise<MongoClient> | undefined;
}

function createClientPromise() {
  const client = new MongoClient(getMongoDbUri());
  return client.connect();
}

function getClientPromise() {
  if (!global.__emailTestingMongoPromise) {
    global.__emailTestingMongoPromise = createClientPromise();
  }
  return global.__emailTestingMongoPromise;
}

export async function getEmailTestingDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getMongoDbName());
}
