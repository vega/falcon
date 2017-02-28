import {} from 'mocha';
import {expect} from 'chai';
import Postgres from '../server/backend/postgres';

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

describe('Postgres', function() {

  describe('Query builder', function() {
    it('should build correct query', function() {
      const query = Postgres.buildQuery({
        type: '1D',
        query: true,
        name: 'DEP_DELAY',
        range: [-10, 42]
      }, {
        activeView: {
          type: '1D',
          name: 'ARR_DELAY',
          range: [0, 0]  // should not matter
        },
        index: 2,
        views: [],
        cacheKeys: {}
      });

      expect(query).to.not.be.null;

      if (query === null) {return;}

      expect(clean(query.text)).to.eql(clean(`SELECT width_bucket("DEP_DELAY", $1, $2, $3) as bucket, count(*)
      FROM flights
      WHERE $4 < "DEP_DELAY" and "DEP_DELAY" < $5 and "ARR_DELAY" < $6
      GROUP BY bucket
      ORDER BY bucket asc;`));
      expect(query.values).to.eql([-10, 42, 25, -10, 42, 2]);
    });
  });
});
