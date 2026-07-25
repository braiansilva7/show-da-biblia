import type { Player } from '../types/game';

export type StoredAuthSession = { token: string; player: Player };

/** Deliberately inert until the login API and secure persistence are introduced. */
export const authStorage = {
  async read(): Promise<StoredAuthSession | null> {
    return null;
  },
  async save(_: StoredAuthSession): Promise<void> {},
  async clear(): Promise<void> {},
};
