import Postgres from './postgres';
import Random from './random';

export const initBackend = (config: {client: string, connection: any}): Backend => {
  switch (config.client) {
    case 'postgres':
      return new Postgres(config.connection);
    case 'random':
      return new Random();
    default:
      throw new Error('Unrecognized backend.');
  }
};
