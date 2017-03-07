import {} from 'mocha';
import {expect} from 'chai';

import { clamp } from '../utils';

describe('Utils', function() {
  it('should clamp correctly', function() {
    expect(clamp(1, [0, 10])).to.eql(1);
    expect(clamp(100, [0, 10])).to.eql(10);
    expect(clamp(-100, [0, 10])).to.eql(0);
  });
});
