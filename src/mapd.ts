import "mapd-connector/dist/browser-connector";

const connector = new (window as any).MapdCon();

// const connection = connector
//   .protocol("https")
//   .host("metis.mapd.com")
//   .port("443")
//   .dbName("mapd")
//   .user("mapd")
//   .password("HyperInteractive");

const connection = connector
  .protocol("https")
  .host("beast-azure.mapd.com")
  .port("443")
  .dbName("newflights")
  .user("demouser")
  .password("HyperInteractive");

connection
  .connectAsync()
  .then(session => {
    session
      .getTablesAsync()
      .then(console.log)
      .catch(console.error);

    session.queryAsync(`SELECT count(*) as n FROM flights`).then(console.log);
  })
  .catch(console.error);
