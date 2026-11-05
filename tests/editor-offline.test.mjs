import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("the editor and the game keep separate offline navigation pages", async () => {
  const handlers = {};
  const entries = new Map();
  const key = (value) => typeof value === "string" ? value : new URL(value.url).pathname;
  const cache = { put: async (request, response) => entries.set(key(request), response.clone()) };
  const caches = {
    open: async () => cache,
    match: async (request) => entries.get(key(request))?.clone(),
  };
  let online = true;
  const fetch = async (request) => {
    if (!online) throw new Error("offline");
    return new Response(new URL(request.url).pathname === "/editor.html" ? "editor" : "game");
  };
  const self = { location: { origin: "https://game.test" }, addEventListener: (type, fn) => { handlers[type] = fn; } };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self, caches, fetch, URL, Response });
  async function navigate(path) {
    let response;
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: `https://game.test${path}` }, respondWith: (promise) => { response = promise; } });
    return (await response).text();
  }
  assert.equal(await navigate("/"), "game");
  assert.equal(await navigate("/editor.html"), "editor");
  online = false;
  assert.equal(await navigate("/"), "game");
  assert.equal(await navigate("/editor.html"), "editor");
});
