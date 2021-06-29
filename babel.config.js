module.exports = {
  presets: [
    [
      "env",
      {
        targets: {
          browsers: ["last 2 Chrome versions", "last 2 Firefox versions"]
        }
      }
    ],
    "@babel/preset-typescript"
  ]
};
