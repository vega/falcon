import Postgres from './postgres';

export const initBackend = (config): Backend => {
  if (config.client === 'postgres') {
    return new Postgres(config.connection);
  }

  throw new Error('Unrecognized backend.');
};
