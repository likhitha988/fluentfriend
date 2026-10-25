import { Types } from 'mongoose';
import { notFound } from './errors';

export function parseObjectId(id: unknown): Types.ObjectId {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id) {
    throw notFound();
  }
  return new Types.ObjectId(id);
}
