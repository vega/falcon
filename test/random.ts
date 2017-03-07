import {} from 'mocha';
import {expect} from 'chai';
import Random from '../server/backend/random';

describe('Random', function() {
  it('should return correct result', function() {
    const r = new Random();
    const query = r.query({
      index: 20,
      activeViewName: 'DEP_DELAY',
      views: [{
        name: 'ARR_DELAY',
        type: '1D',
        query: true,
        range: [20, 30],
        brush: [20, 30]
      }, {
        name: 'DEP_DELAY_ARR_DELAY',
        type: '2D',
        query: true,
        ranges: [[0, 10], [20, 30]]
      }]
    });

    return query.then((res) => {
      expect(res['ARR_DELAY'].length).to.equal(25);

      expect(res['DEP_DELAY_ARR_DELAY'].length).to.equal(30);
      expect((res['DEP_DELAY_ARR_DELAY'][0] as any[]).length).to.equal(25);
    });
  });
});
