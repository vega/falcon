# big-crossfilter

Crossfiltering with a server

## Data

http://www.transtats.bts.gov/DL_SelectFields.asp?Table_ID=236&DB_Short_Name=On-Time

## Load data into postgres using CSVkit

```
csvsql data/354826721_T_ONTIME.csv --db postgresql:///postgres --table flights --insert
```
