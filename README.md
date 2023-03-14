<p align="center">
  <img src="https://user-images.githubusercontent.com/65095341/224896033-afc8bd8e-d0e0-4031-a7b2-3857bef51327.svg" width="65%">
</p>

# FalconVis

[![npm version](https://img.shields.io/npm/v/falcon-vis.svg)](https://www.npmjs.com/package/falcon-vis) ![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

A javascript library to cross-filter millions of records in your own applications without latencies!

Try out [the live demo](http://dig.cmu.edu/falcon/) using FalconVis.

Implements the original [Falcon](https://github.com/vega/falcon) under the hood.

## Usage

Preview of [`data/movies.json`](data/movies.json): an array of objects

```json
[
	{
		"Title": "Forrest Gump",
		"US_Gross": 329694499,
		"MPAA_Rating": "PG-13",
		...
	},
	...
	{
		"Title": "Star Wars Ep. VI: Return of the Jedi",
		"US_Gross": 309205079,
		"MPAA_Rating": "PG",
		...
	}
]
```

### Getting Started

Create a falcon object to get ready to cross-filter

```typescript
import * as falconVis from "falcon-vis";

const data = await fetch("data/movies.json").then((d) => d.json());
const jsonDB = new falconVis.JsonDB(data);

// this object will be used for cross-filtering
const falcon = new falconVis.Falcon(jsonDB);
```

For larger data, or data on a server, use a different DB also provided by FalconVis:

-   ArrowDB
-   DuckDB
-   HttpDB
-   MapDDB

(todo link docs on these usages)

### Initializing Views

FalconVis operates by linking together views. You directly interact with views after linking them to the falcon object.

```typescript
const falcon = new falconVis.Falcon(jsonDB);

// link the US_Gross earnings for the movies
const usGrossView = await falcon.linkView1D(
	{
		type: "continuous",
		name: "US_Gross",
		bins: 25,
		resolution: 400, // my actual visualization is 400px wide
	},
	// onChange gets called every time new filters are applied to any linked view
	(updatedBinCounts) => {
		// for example, I could update the DOM with these counts
		console.log(updatedBinCounts);
	}
);

// link the movie ratings
const ratingView = await falcon.linkView1D(
	{
		type: "categorical",
		name: "MPAA_Rating",
	},
	(updatedBinCounts) => {
		console.log(updatedBinCounts);
	}
);

// link the total number of rows selected (number that remain after filter)
const totalCount = await falcon.linkCount((updatedCount) => {
	console.log(updateCount);
});

// initially populate ALL the views' counts
await falcon.initializeAllCounts();

// OR you can manually call view.initializeAllCounts() for each one
await usGrossView.initializeAllCounts();
await ratingView.initializeAllCounts();
await totalCount.initializeAllCounts();
```

### Cross-filtering views

FalconVis uses [Falcon](https://github.com/vega/falcon) to cross-filter views latency free for even very large amounts of data (many millions or billions).

All you need to do is call `.activate()` (for the [Falcon](https://github.com/vega/falcon) magic) and `.select()` to cross-filter (you `.select()` what to keep).

Each time `.select()` is called, the onChange functions defined in the previous section for all linked views will be called (since the counts get updated).

```typescript
// after activation, subsequence .select() will be O(1) constant time calls
await usGrossView.activate();

// cross-filter between $500,000 and $1_000_000
await usGrossView.select([500_000, 1_000_000]);

// if you want to deselect
await usGrossView.select();

// or activate a different view and add another filter
await ratingView.activate();
await ratingView.select(["PG-13", "G"]);
```

### Returning cross-filtered entries

You call this on demand, and does not update every time the counts update in the views.

```typescript
// returns 20 entries that are selected from the applied cross-filters
// as an iterator
let entries = await falcon.getEntries({ offset: 0, length: 20 });
for (const entry of entries) {
	console.log(entry);
}

// returns next 20 entries (after the first 20)
entries = await falcon.getEntries({ offset: 20, length: 20 });
```

Using offset and length, you can see how to easily implement pagination.

### Examples

To see real working examples, check out the self-contained examples in the [`examples/`](examples/) directory.

Check out the workspace [`package.json`](package.json) or the specific example's `package.json` for more information on how to run them.

### Development

Check out the [`CONTRIBUTING.md`](CONTRIBUTING.md) document to see how to run the development server.
