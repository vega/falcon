import {} from 'mocha';
import { SimpleCache } from '../client/cache/simple';
import {expect} from 'chai';

describe('Cache', function() {
  const cache = new SimpleCache();
  cache.set('foo', 10, [1,2,3]);

  it('should get correctly', function() {
    expect(cache.get('bar', 10)).to.eql(undefined);
    expect(cache.get('foo', 10)).to.eql([1,2,3]);
  });

  it('should get entry correctly', function() {
    expect(cache.getEntry('bar')).to.eql(undefined);
    expect(cache.getEntry('foo').get(10)).to.eql([1,2,3]);
  });
});
