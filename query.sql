EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
SELECT width_bucket("DEP_DELAY", 0, 100, 25) as bucket, count(*)
FROM flights
WHERE 0 < "DEP_DELAY" and "DEP_DELAY" < 100 and -100 < "ARR_DELAY" and "ARR_DELAY" < 0 and 50 < "DISTANCE" and "DISTANCE" < 2000
GROUP BY bucket order by bucket asc;