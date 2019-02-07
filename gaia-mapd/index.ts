import { App, MapDDB, Views, omit, bin } from "../src";
import { createElement } from "../flights/utils";
import { mean, quantile, variance } from "d3";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "count"
  | "phot_g_mean_mag"
  | "ra_dec"
  | "parallax"
  | "radial_velocity"
  | "hrdiag";

type DimensionName =
  | "phot_g_mean_mag"
  | "ra"
  | "dec"
  | "parallax"
  | "radial_velocity"
  | "mg"
  | "bp_rp";

const views: Views<ViewName, DimensionName> = new Map();

views.set("count", {
  title: "Stars selected",
  type: "0D",
  el: createElement("count")
});
views.set("phot_g_mean_mag", {
  title: "Magnitude",
  type: "1D",
  el: createElement("phot_g_mean_mag"),
  dimension: {
    name: "phot_g_mean_mag",
    bins: 25,
    extent: [0, 24],
    format: "d"
  }
});
views.set("parallax", {
  title: "Parallax",
  type: "1D",
  el: createElement("parallax"),
  dimension: {
    name: "parallax",
    bins: 25,
    extent: [-5, 10],
    format: "d"
  }
});
views.set("radial_velocity", {
  title: "Radial Velocity",
  type: "1D",
  el: createElement("radial_velocity"),
  dimension: {
    name: "radial_velocity",
    bins: 25,
    extent: [-160, 160],
    format: "d"
  }
});
views.set("ra_dec", {
  title: "Right Ascension and Declination",
  type: "2D",
  chartSize: [600, 300],
  el: createElement("radec"),
  dimensions: [
    {
      title: "Ra",
      name: "ra",
      bins: 50,
      extent: [0, 360],
      format: "d"
    },
    {
      title: "Dec",
      name: "dec",
      bins: 25,
      extent: [-90, 90],
      format: "d"
    }
  ]
});
views.set("hrdiag", {
  title: "Hertzsprung-Russell diagram",
  type: "2D",
  chartSize: [260, 300],
  el: createElement("hrdiag"),
  dimensions: [
    {
      title: "G_BP - G_RP",
      name: "bp_rp",
      bins: 20,
      extent: [0, 7],
      format: "d"
    },
    {
      title: "Mg",
      name: "mg",
      bins: 25,
      extent: [-7, 17],
      format: "d"
    }
  ]
});

const names = new Map<DimensionName, string>();

names.set("dec", "c8_dec");
names.set("mg", "phot_g_mean_mag + 5.0 * log10(parallax) - 10.0");

const db = new MapDDB(
  {
    // Note: need to update the IP address
    host: "54.189.109.155",
    db: "mapd",
    user: "mapd",
    password: "HyperInteractive",
    protocol: "http",
    port: 9092
  },
  "stars_gaia",
  names
);

// ["solution_id", "designation", "source_id", "random_index", "ref_epoch", "ra", "ra_error", "c8_dec", "dec_error", "parallax", "parallax_error", "parallax_over_error", "pmra", "pmra_error", "pmdec", "pmdec_error", "ra_dec_corr", "ra_parallax_corr", "ra_pmra_corr", "ra_pmdec_corr", "dec_parallax_corr", "dec_pmra_corr", "dec_pmdec_corr", "parallax_pmra_corr", "parallax_pmdec_corr", "pmra_pmdec_corr", "astrometric_n_obs_al", "astrometric_n_obs_ac", "astrometric_n_good_obs_al", "astrometric_n_bad_obs_al", "astrometric_gof_al", "astrometric_chi2_al", "astrometric_excess_noise", "astrometric_excess_noise_sig", "astrometric_params_solved", "astrometric_primary_flag", "astrometric_weight_al", "astrometric_pseudo_colour", "astrometric_pseudo_colour_error", "mean_varpi_factor_al", "astrometric_matched_observations", "visibility_periods_used", "astrometric_sigma5d_max", "frame_rotator_object_type", "matched_observations", "duplicated_source", "phot_g_n_obs", "phot_g_mean_flux", "phot_g_mean_flux_error", "phot_g_mean_flux_over_error", "phot_g_mean_mag", "phot_bp_n_obs", "phot_bp_mean_flux", "phot_bp_mean_flux_error", "phot_bp_mean_flux_over_error", "phot_bp_mean_mag", "phot_rp_n_obs", "phot_rp_mean_flux", "phot_rp_mean_flux_error", "phot_rp_mean_flux_over_error", "phot_rp_mean_mag", "phot_bp_rp_excess_factor", "phot_proc_mode", "bp_rp", "bp_g", "g_rp", "radial_velocity", "radial_velocity_error", "rv_nb_transits", "rv_template_teff", "rv_template_logg", "rv_template_fe_h", "phot_variable_flag", "l", "b", "ecl_lon", "ecl_lat", "priam_flags", "teff_val", "teff_percentile_lower", "teff_percentile_upper", "a_g_val", "a_g_percentile_lower", "a_g_percentile_upper", "e_bp_min_rp_val", "e_bp_min_rp_percentile_lower", "e_bp_min_rp_percentile_upper", "flame_flags", "radius_val", "radius_percentile_lower", "radius_percentile_upper", "lum_val", "lum_percentile_lower", "lum_percentile_upper"]

// BENCHMARK: get switching time

async function dbBenchmark() {
  await db.initialize();

  for (const [_name, view] of views) {
    if (view.type === "1D") {
      const binConfig = bin(view.dimension.bins, view.dimension.extent);
      view.dimension.binConfig = binConfig;
    } else if (view.type === "2D") {
      for (const dimension of view.dimensions) {
        const binConfig = bin(dimension.bins, dimension.extent);
        dimension.binConfig = binConfig;
      }
    }
  }

  // warmup
  // for (const [name, view] of views) {
  //   if (view.type === "1D") {
  //     await Promise.all(
  //       db.loadData1D(view, 200, omit(views, name), new Map()).values()
  //     );
  //   } else if (view.type === "2D") {
  //     await Promise.all(
  //       db.loadData2D(view, [30, 30], omit(views, name), new Map()).values()
  //     );
  //   }
  // }

  function print(timings: number[]) {
    timings.sort((a, b) => a - b);

    console.log("Mean", mean(timings));
    console.log("Median", quantile(timings, 0.5));
    console.log("95 quantile", quantile(timings, 0.95));

    console.log();
    console.log("90 quantile", quantile(timings, 0.9));
    console.log("Stdev", Math.sqrt(variance(timings)));
    console.log("Min", timings[0]);
    console.log("Max", timings[timings.length - 1]);
  }

  //*
  // run prefetch for all views
  const runs = 1;

  // high res
  const [twoDres, oneDres] = [[200, 200] as [number, number], 500];
  // low res
  // const [twoDres, oneDres] = [[25, 25] as [number, number], 25];

  const raceTimings: number[] = [];
  const allTimings: number[] = [];
  for (let i = 0; i < runs; i++) {
    for (const [name, view] of views) {
      const time = performance.now();
      let promises: Promise<any>[];
      if (view.type === "1D") {
        promises = Array.from(
          db.loadData1D(view, oneDres, omit(views, name), new Map()).values()
        );
      } else if (view.type === "2D") {
        promises = Array.from(
          db.loadData2D(view, twoDres, omit(views, name), new Map()).values()
        );
      } else {
        continue;
      }

      await Promise.race(promises);
      raceTimings.push(performance.now() - time);

      await Promise.all(promises);

      allTimings.push(performance.now() - time);
    }
  }
  console.log("Race");
  print(raceTimings);
  console.log("All");
  print(allTimings);

  /*/
  // compare resolutions
  const runs = 10;

  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    const view = views.get("DISTANCE");
    const time = performance.now();
    if (view.type === "1D") {
      await db.loadData1D(view, 50, omit(views, name), new Map());
    } else if (view.type === "2D") {
      await db.loadData2D(view, [200, 200], omit(views, name), new Map());
    }
    timings.push(performance.now() - time);
  }

  print(timings);

  //*/

  alert("done");
}

// BENCHMARK: test the db only
window.setTimeout(dbBenchmark, 1000);
