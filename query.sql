with binned as (
  select floor("DEP_DELAY"/10)*10 "BIN_DEP_DELAY", floor("ARR_DELAY"/10)*10 "BIN_ARR_DELAY", "DISTANCE"
  from flights
  where "DEP_DELAY" is not null and "ARR_DELAY" is not null and "DISTANCE" is not null)
select "BIN_DEP_DELAY", "BIN_ARR_DELAY", sum(count(*)) OVER (ORDER BY "BIN_DEP_DELAY")
from binned
where "DISTANCE" < 2000
group by "BIN_DEP_DELAY", "BIN_ARR_DELAY";



with binned as (
  select
    floor(1.0 * ("DISTANCE" - 50) / (2000 - 50) * 600) as activeBucket,
    floor(1.0 * ("DEP_DELAY" - -10) / (100 - -10) * 25) as bucket
  from flights
  where
    -10 <= "DEP_DELAY" and "DEP_DELAY" < 100
    and 50 <= "DISTANCE" and "DISTANCE" < 2000
)
select activeBucket, bucket, sum(count(*)) over (partition by bucket order by activeBucket) as cnt
from binned
group by activeBucket, bucket
order by activeBucket, bucket;


with binned as (
  select
    floor(1.0 * ("DISTANCE" - 50) / (2000 - 50) * 600) as activeBucket,
    floor(1.0 * ("DEP_DELAY" - -10) / (100 - -10) * 25) as bucket
  from flights
  where
    -10 <= "DEP_DELAY" and "DEP_DELAY" < 100
    and 50 <= "DISTANCE" and "DISTANCE" < 2000
)
select activeBucket, bucket, (
  select count(*)
  from binned as b2
  where b2.activeBucket < b1.activeBucket and b2.bucket = b1.bucket
) as cnt
from binned as b1
group by activeBucket, bucket
order by activeBucket, bucket;
