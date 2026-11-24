import { ObjectId } from 'mongodb';

export type DbId = ObjectId | string;

export function newObjectIdString(): string {
  return new ObjectId().toHexString();
}

export function toObjectId(id: string): ObjectId | null {
  return /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export function toDbId(id: string): DbId {
  return toObjectId(id) ?? id;
}
