<p align="center">
  <img src="logo/logo.png" width="200" style="transform: rotate(90deg);">
</p>

# Falcon

![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

Crossfilter millions of records without latencies. This fork of [Falcon](https://github.com/vega/falcon) offers an API, so you can crossfilter on your own data and own charts!

## Usage

### Import

Import the main `Falcon` object and whichever data you plan to use

```typescript
import { Falcon, ObjectDB, ArrowDB, DuckDB } from "falcon2";
```

### Database

Add your data to one of the FalconDB supported formats.

**ObjectDB**

```typescript
const animals = {
	name: ["Giraffe", "Lion", "Zebra"],
	weightKg: [1900, 200, 220],
};

// ObjectDB can take a columnar object
const db = new ObjectDB(animals);
```

or row-wise like this

```typescript
const animals = [
	{ name: "Giraffe", weightKg: 1900 },
	{ name: "Lion", weightKg: 200 },
	{ name: "Zebra", weightKg: 220 },
];

// ObjectDB can take a row object
const db = new ObjectDB(animals);
```

**ArrowDB**

```typescript
import { tableFromIPC } from "apache-arrow";

// load in arrow table from filename
const arrowFilename = "animals.arrow";
const data = await fetch(url);
const buffer = await data.arrayBuffer();
const table = tableFromIPC(buffer);

// ArrowDB takes in an arrow Table
const db = new ArrowDB(animalsTable);
```

**DuckDB**

```typescript
import * as duckdb from "@duckdb/duckdb-wasm";

// load in your own duckdb instance (not shown here)
const duck: duckdb.AsyncDuckDB;
const tableName = "animals";

// DuckDB takes the duckdb-wasm db and table name to read from
const db = new DuckDB(duck, tableName);
```

## Development

```bash
yarn       # install packages for entire workspace
yarn dev   # runs demo in browser
```
