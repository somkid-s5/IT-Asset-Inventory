import { randomBytes } from 'crypto';

export function createAvatarSeed() {
  return randomBytes(8).toString('hex');
}
