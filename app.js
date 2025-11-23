const express = require("express");
const app = express();

let healthy = true;
let ready = true;

const client = require("prom-client");
client.collectDefaultMetrics();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route']
});
register.registerMetric(httpRequestsTotal);

app.use((req, res, next) => {
  httpRequestsTotal.inc({ method: req.method, route: req.url });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});


// Simulate slow startup
setTimeout(() => {
  console.log("Startup done!");
  healthy = true;
  ready = true;
}, 20000); // 20 seconds

// ==========================
// Root UI (white theme + Canary Notes + Self-Heal buttons)
// ==========================
app.get("/", (req, res) => {
  if (!ready) {
    res.status(503).send("<h1>Not Ready</h1>");
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Notes - Canary</title>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-white min-h-screen flex flex-col text-black">
        <!-- Top bar -->
        <header class="bg-white border-b border-gray-200">
          <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i data-lucide="notebook-pen" class="w-6 h-6 text-black"></i>
              <span class="text-lg font-semibold tracking-tight">Notes - Canary</span>
            </div>
            <div class="relative w-72 max-w-xs hidden sm:block">
              <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
              <input
                type="text"
                id="searchInput"
                placeholder="Search notes..."
                class="bg-gray-100 border border-gray-300 text-black rounded-full pl-10 pr-4 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                oninput="handleSearch(this.value)"
              />
            </div>
          </div>
        </header>

        <!-- Self-Heal Testing Buttons -->
        <section class="max-w-6xl mx-auto px-6 py-8">
          <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">K8s Self-Heal Testing</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <button onclick="callEndpoint('/healthz')" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md font-medium text-white">Check Health</button>
            <button onclick="callEndpoint('/unhealthy')" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md font-medium text-white">Mark Unhealthy</button>
            <button onclick="callEndpoint('/ready')" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-medium text-white">Mark Ready</button>
            <button onclick="callEndpoint('/notready')" class="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md font-medium">Mark Not Ready</button>
          </div>
          <div id="response" class="mt-4 text-center text-gray-600"></div>
        </section>

        <!-- Main empty state -->
        <main class="flex-1 flex items-center justify-center">
          <div class="text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <i data-lucide="file-text" class="w-7 h-7 text-gray-400"></i>
            </div>
            <div>
              <p class="text-lg font-semibold text-gray-900">No notes yet</p>
              <p class="text-sm text-gray-500 mt-1">Create your first note to get started.</p>
            </div>
            <button
              onclick="createNote()"
              class="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create Note
            </button>
          </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-gray-200">
          <div class="max-w-6xl mx-auto px-6 py-2 text-center text-xs text-gray-500">
            Canary Notes v1.0
          </div>
        </footer>

        <!-- Floating Action Button -->
        <button
          onclick="createNote()"
          class="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
          aria-label="Create Note"
        >
          <i data-lucide="plus" class="w-5 h-5"></i>
        </button>

        <script>
          lucide.createIcons();

          async function callEndpoint(endpoint) {
            const res = await fetch(endpoint);
            const text = await res.text();
            document.getElementById("response").innerText = endpoint + ": " + text;
          }

          function handleSearch(query) {
            console.log("Searching for:", query);
          }

          function createNote() {
            alert("Create Note clicked (stub)");
          }
        </script>
      </body>
    </html>
  `);
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
app.get("/readyz", (req, res) => {
  if (ready) res.send("READY");
  else res.status(503).send("NOT READY");
});

app.get("/unhealthy", (req, res) => {
  healthy = false;
  res.send("Marked unhealthy");
});

app.get("/healthz", (req, res) => {
  res.set("Cache-Control", "no-store");
  
  if (healthy) res.send("OK");
  else res.status(500).send("NOT OK");
});


app.listen(3000, () => console.log("Server running on 3000"));
