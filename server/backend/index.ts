import Postgres from './postgres';

export const initBackend = (config: {client: string, connection: any}): Backend => {
  if (config.client === 'postgres') {
    return new Postgres(config.connection);
  }

  throw new Error('Unrecognized backend.');
};
