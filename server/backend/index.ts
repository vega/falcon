import Postgres from './postgres';

interface Backend {
  query(dimension: string, predicates: Dimension[]);
};

const initBackend = (config) => {
  if (config.client === 'postgres') {
    return new Postgres(config.connection);
  }

  throw new Error('Unrecognized backend.');
}

export {
  Backend,
  initBackend
};
