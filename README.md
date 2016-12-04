# big-crossfilter

Crossfiltering with a server

## Data

http://www.transtats.bts.gov/DL_SelectFields.asp?Table_ID=236&DB_Short_Name=On-Time

### Load data into postgres using CSVkit

```
csvsql data/354826721_T_ONTIME.csv --db postgresql:///postgres --table flights --insert
```

### Speed up queries with indexes

```sql
create index on flights("YEAR");
create index on flights("MONTH");
create index on flights("DAY_OF_MONTH");
create index on flights("DAY_OF_WEEK");
create index on flights("CRS_DEP_TIME");
create index on flights("DEP_DELAY");
create index on flights("CRS_ARR_TIME");
create index on flights("ARR_DELAY");
create index on flights("DISTANCE");
```

## Running

* Watch the client side files
```
$ npm run watch
```

* Run the server and watch for changes
```
$ npm run server
```
