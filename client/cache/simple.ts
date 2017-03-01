import { isPoint1D } from '../../utils';

export function getIndexValueKey(indexValue: Point | undefined): string {
  if (indexValue === undefined) {
    return 'inf';
  }

  if (isPoint1D(indexValue)) {
    return '' + indexValue;
  } else {
    return `${indexValue[0]} ${indexValue[1]}`;
  }
}

export class SimpleIndex {
  private index: {[indexValue: string]: ResultRow};

  constructor() {
    this.index = {};
  }

  public get(indexValue: Point | undefined) {
    return this.index[getIndexValueKey(indexValue)];
  }

  public set(indexValue: Point | undefined, data: ResultRow) {
    this.index[getIndexValueKey(indexValue)] = data;
  }
}

export class SimpleCache {
  private cache: {[brushesAndView: string]: SimpleIndex};

  constructor() {
    this.cache = {};
  }

  public get(key: string | undefined, indexValue: Point | undefined): ResultRow | undefined {
    if (key === undefined) {
      throw new Error('Key cannot be undefined');
    }

    const e = this.cache[key];
    if (!e) {
      return undefined;
    };
    return e.get(indexValue);
  }

  public getEntry(key: string | undefined) {
    if (key === undefined) {
      throw new Error('Key cannot be undefined');
    }

    return this.cache[key];
  }

  public set(key: string | undefined, indexValue: Point | undefined, data: ResultRow) {
    if (key === undefined) {
      throw new Error('Key cannot be undefined');
    }

    let e = this.cache[key];
    if (!e) {
      e = new SimpleIndex();
      this.cache[key] = e;
    };
    e.set(indexValue, data);
  }
}
