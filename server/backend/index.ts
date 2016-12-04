import Postgres from './postgres';

interface Backend {
  query(dimension: string, predicates: Predicate[]);
};

interface Predicate {
  name: string;
  lower?: number;
  upper?: number;
};

const initBackend = (config) => {
  if (config.client === 'postgres') {
    return new Postgres(config.connection);
  }

  throw new Error('Unrecognized backend.');
};

export {
  Backend,
  Predicate,
  initBackend
};
