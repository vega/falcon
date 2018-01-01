# big-crossfilter

Crossfiltering with a server

First version that turned out to be too complicated is at https://github.com/uwdata/big-crossfilter/tree/complex.

![Crossfilter demo](cross.gif "Crossfilter demo")

## helpful commands

`~/.local/bin/csvcut -t -c FlightDate,DepTime,DepDelay,ArrTime,ArrDelay,AirTime,Distance flights-3m.csv > flights-3m-clean.csv`

### Import into Postgres

`COPY flights FROM '/Users/domoritz/Developer/UW/crossfilter/data/flights-3m.csv' WITH CSV HEADER;`

### Import into MonetDB

`COPY INTO flights from '/Users/domoritz/Developer/UW/crossfilter/data/flights-3m.csv' USING DELIMITERS ',','\n','\"' best effort;`

### Create Table

```sql
CREATE TABLE flights (
    "FL_DATE" numeric,
    "DEP_TIME" numeric,
    "DEP_DELAY" numeric,
    "ARR_TIME" numeric,
    "ARR_DELAY" numeric,
    "AIR_TIME" numeric,
    "DISTANCE" numeric
);
```
