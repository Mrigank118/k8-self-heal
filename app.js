const express = require("express");
const app = express();

let healthy = true;
let ready = true;

const client = require('prom-client');
client.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});


// Simulate slow startup 
setTimeout(() => {
    console.log("Startup done!");
    healthy = true;
    ready = true;
  }, 20000); // 20 seconds

app.get("/", (req, res) => {
  if (ready) res.send("App is running 🚀");
  else res.status(503).send("Not Ready");
});

app.get("/notready", (req, res) => {
    ready = false;
    res.send("Marked not ready");
});

app.get("/ready", (req, res) => {
    ready = true;
    res.send("Marked ready");
});
  


app.get("/crash", (req, res) => {
  console.log("Simulating crash...");
  process.exit(1);
});

app.get("/unhealthy", (req, res) => {
  healthy = false;
  res.send("Marked unhealthy");
});

app.get("/healthz", (req, res) => {
  if (healthy) res.send("OK");
  else res.status(500).send("NOT OK");
});

app.listen(3000, () => console.log("Server running on 3000"));
