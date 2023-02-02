<p align="center">
  <img src="logo/logo.png" width="200" style="transform: rotate(90deg);">
</p>

# Falcon

![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

Crossfilter millions of records without latencies. This fork of [Falcon](https://github.com/vega/falcon) offers an API, so you can crossfilter on your own data and own charts

Try out the [live demo](http://dig.cmu.edu/falcon/)

[![movies-duckdb-demo](https://user-images.githubusercontent.com/65095341/216470386-913e7bd3-a8f2-4fbb-b63f-88bec05520be.gif)](http://dig.cmu.edu/falcon/)

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
	animalName: ["Giraffe", "Lion", "Zebra"],
	weightKg: [1900, 200, 220],
};

// ObjectDB can take a columnar object
const db = new ObjectDB(animals);
```

or row-wise like this

```typescript
const animals = [
	{ animalName: "Giraffe", weightKg: 1900 },
	{ animalName: "Lion", weightKg: 200 },
	{ animalName: "Zebra", weightKg: 220 },
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

### Falcon

Take your FalconDB and create a Falcon object.

```typescript
const falcon = new Falcon(db);
```

**Create Views**

To keep track of total counts, use `view0D` or alias `count`. Directly call the object created from `falcon = new Falcon(db)`. The returned value is the view you can interact with.

```typescript
const counts = falcon.count();
```

To create create a 1-D histogram, you can create a 1-D view by specifying a dimension.

-   Categorical

```typescript
const namesView = falcon.view1D({
	type: "categorical",
	name: "animalName",
});
```

-   Continuous

```typescript
const weightsKgView = falcon.view1D({
	type: "continuous",
	name: "weightKg",
	resolution: 200, // the total number of pixels you plan to brush over
	bins: 2,
});
```

**View Counts**

After creating a view, you can directly add a `onChange` listener that gets called every time that view count changes.

Here, you can directly define how the counts get visualized for example with `d3`.

```typescript
/**
 * the state argument will contain total and filtered counts
 * as well as bins
 */
count.onChange((state) => {
	console.log(state);
});
namesView.onChange((state) => {
	console.log(state);
});
weightsKgView.onChange((state) => {
	console.log(state);
});
```

To initially populate the counts for all the views call the `all` method on the global falcon object.

```typescript
await falcon.all();
```

**View Interaction**
You can directly declare what you want to filter with `select`.

```typescript
weightsKgView.select([0, 400]);
namesView.select(["zebra", "giraffe"]);
```

then all the views will run their `onChange` if the count changes based on the cross-filter selection.

or deselect

```typescript
weightsKgView.select();
namesView.select();
```

**Falcon Prefetching**
Under the hood, `select` calls the `view.prefetch()` which is responsible for the massive speedups (as described in the [paper](https://idl.cs.washington.edu/files/2019-Falcon-CHI.pdf)).

You can call this beforehand if you think a user will `select` a particular view.

for example, if they are hovering a bar chart for the weights view, you can call prefetch beforehand. So when they do brush over the view they will have a smooth experience.

```typescript
await weightsKgView.prefetch();
```

## Examples

To see examples of the usages, run examples in the `examples/` directory. Check out the `package.json` to see how to run each one.

## Development

```bash
yarn       # install packages for entire workspace
yarn dev   # runs demo in browser
```
