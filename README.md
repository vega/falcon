<p align="center">
  <img src="https://user-images.githubusercontent.com/65095341/224896033-afc8bd8e-d0e0-4031-a7b2-3857bef51327.svg" width="65%">
</p>

[![npm version](https://img.shields.io/npm/v/falcon-vis.svg)](https://www.npmjs.com/package/falcon-vis) ![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

`FalconVis` is a JavaScript library that links your own custom visualizations at scale! We also support a variety of [data formats](#data) for different scales of data (e.g., Apache Arrow, DuckDB WASM, backend servers, and more).

You can cross-filter billions of data entries in the browser with no interaction delay by using the [Falcon](https://www.domoritz.de/papers/2019-Falcon-CHI.pdf) data index.

`FalconVis` was created by [Donny Bertucci](https://donnybertucci.com) and [Dominik Moritz](https://www.domoritz.de/) because the previous implementation ([`vega/falcon`](https://github.com/vega/falcon)) could not be used as a library or with custom visualizations.

**Table of Contents**

-   [Examples](#examples)
-   [Usage](#usage)
-   [API Reference](#api-reference)

## Examples

**`Github Pages`**

| Data                                                                                     | Type        | Count | Live Demo                                                                            |
| ---------------------------------------------------------------------------------------- | ----------- | ----- | ------------------------------------------------------------------------------------ |
| Movies                                                                                   | Arrow       | 3k    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/movies-arrow/)        |
| Movies                                                                                   | JSON        | 3k    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/movies-json/)         |
| Movies                                                                                   | DuckDB WASM | 3k    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/movies-duckdb/)       |
| Flights (with US Map)                                                                    | DuckDB WASM | 3m    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/flights-duckdb/)      |
| Flights (comparison with [crossfilter](https://github.com/crossfilter/crossfilter) fork) | DuckDB WASM | 3m    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/crossfilter-duckdb/)  |
| Flights (comparison with [crossfilter](https://github.com/crossfilter/crossfilter) fork) | HeavyAI     | 7m    | [Click to open on Github Pages](https://dig.cmu.edu/falcon-vis/crossfilter-heavyai/) |

**`ObservableHQ`**

| Data    | Type        | Count | Live Demo                                                                    |
| ------- | ----------- | ----- | ---------------------------------------------------------------------------- |
| Flights | Arrow       | 1m    | [Click to open on ObservableHQ](https://observablehq.com/d/68fae2b29f7f389a) |
| Flights | DuckDB WASM | 3m    | [Click to open on ObservableHQ](https://observablehq.com/d/75371ab6ea37d20c) |
| Flights | DuckDB WASM | 10m   | [Click to open on ObservableHQ](https://observablehq.com/d/ee8baae0a36606d7) |

**`Other`**

| Data                  | Type                  | Count | Live Demo                                                                               |
| --------------------- | --------------------- | ----- | --------------------------------------------------------------------------------------- |
| Flights (with US Map) | HTTP to DuckDB Python | 10m   | [Click to open on HuggingFace🤗 Spaces](https://huggingface.co/spaces/donnyb/FalconVis) |

## Usage

Install `FalconVis` via [npm](https://www.npmjs.com/package/falcon-vis).

```sh
npm install falcon-vis
```

### Data

Before you filter your data, you need to tell `FalconVis` about your data.

`FalconVis` currently supports JavaScript objects, Apache Arrow tables, DuckDB WASM, and HTTP GET Requests. For different data sizes, or if you want the computation to take place in the browser, different data types are recommended.

| DB                        | Recommended Data Size            | Memory/Computation | Description                                                                                    |
| ------------------------- | -------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| [`JsonDB`](#JsonDB)       | up to 500k                       | Browser            | Takes JavaScript object                                                                        |
| [`ArrowDB`](#ArrowDB)     | up to 1m                         | Browser            | Takes [Apache Arrow](https://github.com/apache/arrow) table                                    |
| [`DuckDB`](#DuckDB)       | up to 10m                        | Browser            | Queries [DuckDB WASM](https://duckdb.org/docs/api/wasm/overview.html) database                 |
| [`HeavyaiDB`](#HeavyaiDB) | whatever your backend can handle | Backend            | Queries [HeavyAI](https://www.heavy.ai/) database connection                                   |
| [`HttpDB`](#HttpDB)       | whatever your backend can handle | Backend            | Sends GET request to a backend server (sends SQL queries and expects arrow tables in response) |

They are all typed as `FalconDB`.

```ts
import { JsonDB, ArrowDB, DuckDB, HttpDB } from "falcon-vis";
```

### Linking Views

First initialize the `FalconVis` instance with your data. I will use the `ArrowDB` for this example for the 1M flights dataset.

```ts
import { tableFromIPC } from "@apache-arrow";
import { FalconVis, ArrowDB } from "falcon-vis";

// load the flights-1m.arrow data into memory
const buffer = await (await fetch("data/flights-1m.arrow")).arrayBuffer();
const arrowTable = await tableFromIPC(buffer);

// initialize the falcon instance with the data
const db = new ArrowDB(arrowTable);
const falcon = new FalconVis(db);
```

Next, create views that contain the data dimension and what happens when the cross-filtered counts change (`onChange`). `FalconVis` supports 0D and 1D views.

Note that your specified `onChange` function is called every time the cross-filtered counts change so that you can update your visualization with the new filtered counts.

**Distance View**

![dist](https://github.com/cmudig/falcon/assets/65095341/e6c474f5-f717-4f48-baff-eb2a2971dd05)

```ts
const distanceView = await falcon.view1D({
	type: "continuous",
	name: "Distance",
	bins: 25,
	resolution: 400,
});
distanceView.onChange((counts) => {
	updateDistanceBarChart(counts);
});
```

**Arrival Delay View**

![delay](https://github.com/cmudig/falcon/assets/65095341/008968fe-f2be-4577-a04e-0a8323a98509)

```ts
const arrivalDelayView = await falcon.view1D({
	type: "continuous",
	name: "ArrDelay",
	range: [-20, 140],
	bins: 25,
	resolution: 400,
});
arrivalDelay.onChange((counts) => {
	updateDelayBarChart(counts);
});
```

**Total Count**

<img width="276" alt="Screenshot 2023-05-20 at 5 32 33 PM" src="https://github.com/cmudig/falcon/assets/65095341/ec903e37-07b6-43c5-b288-32875db0d073">

```ts
const countView = await falcon.view0D();
countView.onChange((count) => {
	updateCount(count);
});
```

Link the views together to fetch the initial counts (outputs are shown above).

```ts
await falcon.link();
```

### Cross-Filtering Views

Now, you can cross-filter the views by calling `.select()` on a view. `FalconVis` uses the [Falcon](https://www.domoritz.de/papers/2019-Falcon-CHI.pdf) data index to cross-filter the views.

Falcon works by activating a single view that you plan to interact with. In the background, we compute the Falcon data index when you activate a view. Then, when you `.select()` on an activated view, in we fetch the cross-filtered counts for the other views in constant time.

**For Example**

I directly `.activate()` the `distanceView` from before to prefetch the Falcon data index.

```ts
await distanceView.activate();
```

Then, I can apply a filter with `.select([rangeStart, rangeEnd])` for continuous data

```ts
await distanceView.select([1000, 2000]); // 1k to 2k miles
```

Which automatically cross-filters and updates the counts for other views in constant time (`onChange` is called for each other view).

In the [live example](https://observablehq.com/d/68fae2b29f7f389a), you can take mouse events to call the `select()` with user selected filters as shown in the video

https://github.com/cmudig/falcon/assets/65095341/ab7fa9fc-d51f-4830-89f6-93ac6913a5d3

## API Reference

<a href="#JsonDB" id="JsonDB">#</a> `class` <b>JsonDB</b>(_object_)

Takes a JavaScript object and attaches `FalconVis` data index methods to it. Under the hood, it converts into a <b>ArrowDB</b> class.

The JsonDB supports row-wise or column-wise object formats, but it is recommended to use column-wise format because the row-wise format converts to column-wise with a copy.

**Columns JSON Example**

```ts
import { JsonDB } from "falcon-vis";

const columnarJson = {
	names: ["bob", "billy", "joe"],
	ages: [21, 42, 40],
};

const db = new JsonDB(columnarJson); // ⬅️
```

**Rows JSON Example**

```ts
import { JsonDB } from "falcon-vis";

const rowJson = [
	{ name: "bob", age: 21 },
	{ name: "billy", age: 42 },
	{ name: "joe", age: 40 },
];

const db = new JsonDB(rowJson); // ⬅️, but does a copy over rowJson
```

<br> <a href="#ArrowDB" id="ArrowDB">#</a> `class` <b>ArrowDB</b>(_table_)

Takes an Apache Arrow `Table` created using the [`apache-arrow`](https://www.npmjs.com/package/apache-arrow) package and attaches `FalconVis` data index methods to it.

**Example**

```ts
import { ArrowDB } from "falcon-vis";
import { tableFromIPC } from "apache-arrow";

const buffer = await (await fetch("data/flights-1m.arrow")).arrayBuffer();
const table = await tableFromIPC(buffer);

const db = new ArrowDB(table); // ⬅️
```

**Arrow Shorthand Example**

```ts
import { ArrowDB } from "falcon-vis";

const db = await ArrowDB.fromArrowFile("data/flights-1m.arrow"); // ⬅️
```

<br> <a href="#DuckDB" id="DuckDB">#</a> `class` <b>DuckDB</b>(_duckdb_, _table_)

Takes a [`@duckdb/duckdb-wasm`](https://github.com/duckdb/duckdb-wasm) db and table name within the db and attaches `FalconVis` data index methods to it.

**Example**

```ts
import { DuckDB } from "falcon-vis";
import * as duckdb from "@duckdb/duckdb-wasm";

// duckdb setup
const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
const worker = await duckdb.createWorker(bundle.mainWorker!);
const logger = new duckdb.ConsoleLogger();
const flightsDb = new duckdb.AsyncDuckDB(logger, worker);
await flightsDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
const c = await flightsDb.connect();
// load parquet file into table called flights
await c.query(
	`CREATE TABLE flights
     AS SELECT * FROM parquet_scan('${window.location.href}/data/flights-1m.parquet')`
);
c.close();

const db = new DuckDB(flightsDb, "flights"); // ⬅️
```

**Parquet Shorthand Example**

If you just want to load one parquet file, you can use the shorthand method `DuckDB.fromParquetFile()`.

```ts
import { DuckDB } from "falcon-vis";

const db = await DuckDB.fromParquetFile("data/flights-1m.parquet"); // ⬅️
```

<br> <a href="#HeavyaiDB" id="HeavyaiDB">#</a> `class` <b>HeavyaiDB</b>(_session_, _table_)

Takes in a _session_ from [`@heavyai/connector`](https://docs.heavy.ai/apis-and-interfaces/heavyai-connector) with a given _table_ name.

**Example**

```ts
import { HeavyaiDB } from "falcon-vis";
import HeavyaiCon from "@heavyai/connector";

const connector = new HeavyaiCon();
const conn = {
	host: "your host url address",
	dbName: "db name",
	user: "user name",
	password: "password",
	protocol: "https",
	port: 443,
};
const connection = connector
	.protocol(conn.protocol)
	.host(conn.host)
	.port(conn.port)
	.dbName(conn.dbName)
	.user(conn.user)
	.password(conn.password);

const session = await connection.connectAsync();

const tableName = "flights";
const db = new HeavyaiDB(session, tableName); // ⬅️
```

**Session Connection Shorthand**

```ts
import { HeavyaiDB } from "falcon-vis";

const tableName = "flights";
const db = await HeavyaiDB.connectSession(️{
    host: "your host url address",
    dbName: "db name",
    user: "user name",
    password: "password",
    protocol: "https",
    port: 443
  }, tableName); // ⬅️
```

<br> <a href="#HttpDB" id="HttpDB">#</a> `class` <b>HttpDB</b>(_url_, _table_, _encodeQuery_?)

HttpDB sends SQL queries (from _table_ name) over HTTP GET to the _url_ and hopes to receive an Apache Arrow table bytes in response.

_encodeQuery_ is an optional parameter that encodes the SQL query before sending it over HTTP GET. By default it uses the [`encodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) function on the SQL query so that it can be sent in the url.

**Example**

```ts
import { HttpDB } from "falcon-vis";

const tableName = "flights";
const db = new HttpDB("http://localhost:8000", tableName); // ⬅️
```

<br> <a href="#FalconVis" id="FalconVis">#</a> `class` <b>FalconVis</b>(_db_)

The main logic that orchestrates the cross-filtering between views.

Takes in the data ([`JsonDB`](#JsonDB), [`ArrowDB`](#ArrowDB), [`DuckDB`](#DuckDB), [`HeavyaiDB`](#HeavyaiDB), or [`HttpDB`](#HttpDB)).

**Example**

```ts
import { FalconVis } from "falcon-vis";

// given a db: FalconDB
const falcon = new FalconVis(db); // ⬅️
```

<br> <a href="#view0D" id="view0D">#</a> `function` <a href="#FalconVis">falcon</a>.<b>view0D</b>(onChangeCallback?)

Adds a 0D view onto an existing `FalconVis` instance named <a href="#FalconVis">falcon</a> and describes what to execute when the counts change.

Takes an `onChangeCallback` function that is called whenever the view count changes (after cross-filtering).

Returns a `View0D` instance (you can add more onChange callbacks to it later).

The `onChangeCallback` gives you access to the updated filtered count and total count of the rows (`View0DState`) object as a parameter.

```ts
interface View0DState {
	total: number | null;
	filter: number | null;
}
```

**Example**

```ts
import { FalconVis } from "falcon-vis";

const falcon = new FalconVis(db);

const countView = falcon.view0D((count) => {
	console.log(count.total, count.filter); // gets called every cross-filter
}); // ⬅️
```

**Example multiple and disposable `onChangeCallback`s**

```ts
import { FalconVis } from "falcon-vis";

const falcon = new FalconVis(db);

// create view0D
const countView = falcon.view0D();
// add onChange callbacks
const disposeA = countView.onChange((count) => {
	console.log("A", count.total, count.filter);
}); // ⬅️
const disposeB = countView.onChange((count) => {
	console.log("B", count.total, count.filter);
}); // ⬅️

// then can be disposed later to stop listening for onChange
disposeA();
disposeB();
```

<br> <a href="#view1D" id="view1D">#</a> `function` <a href="#FalconVis">falcon</a>.<b>view1D</b>(dimension, onChangeCallback?)

Adds a 1D view onto an existing `FalconVis` instance named <a href="#FalconVis">falcon</a> and describes what to execute when the counts change. A 1D view is a histogram of the data with counts per bin.

<i>dimension</i> is a `Dimension` object that defines which data column to use for the 1D view. (more info below)

Takes an `onChangeCallback` function that is called whenever the view count changes (after cross-filtering).

Returns a `View1D` instance (you can add more onChange callbacks to it later).

The <i>dimension</i> can be `type: "categorical"` for discrete values or `type: "continuous"` for ranged values.

A continuous `Dimension` can be defined as follows (with ? being optional parameters):

```ts
interface ContinuousDimension {
	/* continuous range of values */
	type: "continuous";

	/* column name in the data table */
	name: string;

	/**
	 * resolution of visualization brushing (e.g., histogram is 400px wide, resolution: 400)
	 * a smaller resolution than the brush will approximate the counts, but be faster
	 */
	resolution: number;

	/**
	 * max number of bins to create, the result could be less bins
	 *
	 * @default computed from the data using scotts rule
	 */
	bins?: number;

	/**
	 * forces the specified number bins to use exactly
	 * otherwise, will use the specified number of bins as a suggestion
	 *
	 * @default false
	 */
	exact?: boolean;

	/**
	 * [min, max] extent to limit the range of data values
	 * @default computed from the data
	 */
	range?: [number, number];

	/* should format for dates */
	time?: boolean;
}
```

A categorical dimension can be defined as follows:

```ts
interface CategoricalDimension {
	/* categorical values */
	type: "categorical";

	/* column name in the data table */
	name: string;

	/**
	 * categorical values to include
	 *
	 * @default computed from the data
	 */
	range?: string[];
}
```

The `onChangeCallback` gives you access to the updated counts per bin (`View1DState`) object as a parameter.

If the view is type continuous:

```ts
interface ContinuousView1DState {
	/* total counts per bin */
	total: Float64Array | null;
	/* filtered counts per bin */
	filter: Float64Array | null;
	/* continuous bins */
	bin: { binStart: number; binEnd: number }[] | null;
}
```

If the view is type categorical:

```ts
interface CategoricalView1DState {
	/* total counts per bin */
	total: Float64Array | null;
	/* filtered counts per bin */
	filter: Float64Array | null;
	/* categorical bin labels */
	bin: string[] | null;
}
```

**Initialization**

```ts
import { FalconVis } from "falcon-vis";

const falcon = new FalconVis(db);

// continuous
const distanceView = await falcon.view1D(
	{
		type: "continuous",
		name: "Distance",
		resolution: 400,
		bins: 25,
	},
	(counts) => {
		console.log(counts.total, counts.filter, counts.bin); // gets called every cross-filter
	}
); // ⬅️

// categorical
const originStateView = await falcon.view1D(
	{
		type: "categorical",
		name: "OriginState",
	},
	(counts) => {
		console.log(counts.total, counts.filter, counts.bin);
	}
); // ⬅️
```

**Interaction**

<a href="#activate" id="activate">#</a> `function` <a href="#view1D">view</a>.<b>activate</b>()

You must `.activate()` a view before `.select()`ing it. `.activate()` computes the [Falcon](https://www.domoritz.de/papers/2019-Falcon-CHI.pdf) index so that subsequent `.select()`s are fast (constant time). More details on the [Falcon](https://www.domoritz.de/papers/2019-Falcon-CHI.pdf) index can be found in the [paper](https://www.domoritz.de/papers/2019-Falcon-CHI.pdf).

<a href="#select" id="select">#</a> `function` <a href="#view1D">view</a>.<b>select</b>(<i>filter</i>)

You can directly interact with you `View1D` (<a href="#view1D">view</a>) instance to filter the dimension and automatically cross-filter all other views on the same `FalconVis` instance.

You only have to call `.activate()` everytime before you interact with a new view, but only once!

The index changes when new filters are present, so if you `.activate()` a view, then `.activate()` a different view and filter that view, when you come back to the original view you have to call `.activate()` again.

Continuous view selection:

```ts
await distanceView.activate(); // compute Falcon index
await distanceView.select([0, 1000]); // filter to only flights with distance between 0 and 1000 miles
await distanceView.select([600, 800]); // change filter
await distanceView.select(); // deselect all
```

Categorical view selection:

```ts
await originStateView.activate(); // compute Falcon index
await originStateView.select(["CA", "PA", "OR"]); // select California, Pennsylvania, and Oregon
await originStateView.select(["FL"]); // change filter
await originStateView.select(); // deselect all
```

After each `.select()` the `onChangeCallback` will be called with the updated counts on all other views.

<br> <a href="#detach" id="detach">#</a> `function` <a href="#view1D">view</a>.<b>detach</b>()
Detach is how you remove your view from the `FalconVis` instance. Note that you directly call this on the <a href="#view1D">view</a> instance, not the `FalconVis` instance.

<br><a href="#attach" id="attach">#</a> `function` <a href="#view1D">view</a>.<b>attach</b>()
Attach is how you add your view back onto the `FalconVis` instance. Note that you directly call this on the <a href="#view1D">view</a> instance, not the `FalconVis` instance.

<br> <a href="#link" id="link">#</a> `function` <a href="#FalconVis">falcon</a>.<b>link</b>()

The link function takes the added views and links them together. This is required before cross-filtering.

link also initializes the counts for all views.

Call link whenever you add or remove views. Calling link once will suffice after adding (or removing) multiple views.

**Example**

```ts
import { FalconVis } from "falcon-vis";

const falcon = new FalconVis(db);

const distanceView = await falcon.view1D(
	{
		type: "continuous",
		name: "Distance",
		resolution: 400,
		bins: 25,
	},
	(counts) => {
		console.log(counts.total, counts.filter, counts.bin);
	}
);
const countView = falcon.view0D((count) => {
	console.log(count.total, count.filter);
});

await falcon.link(); // 🔗⬅️
```

Which then proceeds to call the `onChangeCallback` for each view with the initial counts. So you will see two console.logs from this particular example to start.

<br> <a href="#entries" id="entries">#</a> `function` <a href="#FalconVis">falcon</a>.<b>entries</b>(<i>location</i>)

This gives you access to the filtered entries. So after cross-filtering you need to manually call this if you want to extract the filtered entries.

Takes a <i>location</i> defined by

```ts
interface Location {
	/* defaults to 0 */
	offset?: number;

	/* defaults to Infinity (all) */
	length?: number;
}
```

Where `offset` refers to the offset in the data table and `length` refers to the number of rows to return.

Note that `offset` refers to the filtered data table, so if you have a filter applied, the offset will be relative to the filtered data table.

Returns an Iterator over the entries in the data table as `Iterable<Row>` where `Row` is an object with key names corresponding to the column names in the data table.

**Example**

```ts
import { FalconVis } from "falcon-vis";

const falcon = new FalconVis(db);

const entries = await falcon.entries({
	offset: 0,
	length: 25,
}); // first 25 entries ⬅️

// print out first 25 distances
for (const entry of entries) {
	console.log(entry["Distance"]);
}
```

You can easily use offset to shift over 25, to then get the second 25 entries. (or by whatever amount you want).

```ts
const entries = await falcon.entries({
	offset: 25, // start after 25 entries
	length: 25,
}); // second 25 entries ⬅️

// print out second 25 distances
for (const entry of entries) {
	console.log(entry["Distance"]);
}
```
