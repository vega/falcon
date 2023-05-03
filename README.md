<p align="center">
  <img src="https://user-images.githubusercontent.com/65095341/224896033-afc8bd8e-d0e0-4031-a7b2-3857bef51327.svg" width="65%">
</p>

# FalconVis

[![npm version](https://img.shields.io/npm/v/falcon-vis.svg)](https://www.npmjs.com/package/falcon-vis) ![Tests](https://github.com/cmudig/falcon/workflows/Node.js%20CI/badge.svg) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=rounded)](https://github.com/prettier/prettier)

**🚧 Work in Progress**

```bash
npm install falcon-vis
```

A simple javascript API to link visualizations at scale. FalconVis is a successor to [`vega/falcon`](https://github.com/vega/falcon).

Finally, you can cross-filter all the data you've been hoarding without the large delays or slowdowns. Interactions are smooth, fast, and responsive.

**Live Browser Examples**

-   [[10 Million Flights | DuckDB WASM on ObservableHQ]](https://observablehq.com/d/75371ab6ea37d20c)
-   [[10 Million Flights | DuckDB Python on Huggingface Spaces]](https://huggingface.co/spaces/donnyb/FalconVis)

## Example

Check out real examples in the [`examples/`](examples/) directory. If you want a quick sneak-peak, keep reading.

TODO make this section more clear.

### Initialization

Create a the `falcon` instance and link it up to some data and some views.

```ts
import { FalconVis, JsonDB } from "falcon-vis";

/**
 * 1. create the falcon instance with a database
 */
const plainOldJavascriptObject = await fetch("flights-10k.json").then((d) =>
	d.json()
);
const db = new JsonDB(plainOldJavascriptObject);
falcon = new FalconVis(db);

/**
 * 2. create the views (you interact with these directly to cross-filter)
 */
// 0D is total count (num rows)
const countView = await falcon.view0D();
countView.onChange((updatedTotalCount) => {
	// called every time the count changes
	console.log(updatedTotalCount); // you can do whatever in here
});

// 1D is a histogram
const distanceView = await falcon.view1D({
	type: "continuous",
	name: "Distance",
	resolution: 400,
	bins: 5,
});
distanceView.onChange((updatedHistogram) => {
	console.log(updatedHistogram);
});

/**
 * 3. initialize falcon by linking everything together
 */
await falcon.link();
```

### Cross-filtering

The view you that you want to filter is the active view. Once you do filter an active view, the `onChange` callbacks will be called with the updated counts for all the other linked views.

```ts
/**
 * 1. make the view you are interacting with active
 *    this computes the fast falcon index in the background
 */
await distanceView.activate();

/**
 * 2. select/filter a range between 0 and 100
 */
await distanceView.select([0, 100]);
```

## API Reference

TODO fill in and add examples

### Core

<br><a href="#">#</a> index.<b>view0D</b>()

<br><a href="#">#</a> index.<b>view1D</b>()

<br><a href="#">#</a> index.<b>link</b>()

<br><a href="#">#</a> index.<b>entries</b>()

<br><a href="#">#</a> view.<b>activate</b>()

<br><a href="#">#</a> view.<b>select</b>()

<br><a href="#">#</a> view.<b>onChange</b>()

## Databases

<br><a href="#">#</a> <b>JsonDB</b>
<br><a href="#">#</a> <b>ArrowDB</b>
<br><a href="#">#</a> <b>DuckDB</b>
<br><a href="#">#</a> <b>HttpDB</b>

## Development

Check out the [`CONTRIBUTING.md`](CONTRIBUTING.md) document to see how to run the development server.
