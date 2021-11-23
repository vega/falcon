module.exports = api =>
  // only use babel in jest tests
  api.env("test")
    ? {
        presets: [
          ["env", { targets: { node: "current" } }],
          "@babel/preset-typescript"
        ]
      }
    : {};
