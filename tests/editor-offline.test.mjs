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
    const pending = [];
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: `https://game.test${path}` }, waitUntil: promise => pending.push(promise), respondWith: (promise) => { response = promise; } });
    const body = await (await response).text();
    await Promise.all(pending);
    return body;
  }
  assert.equal(await navigate("/"), "game");
  assert.equal(await navigate("/editor.html"), "editor");
  online = false;
  assert.equal(await navigate("/"), "game");
  assert.equal(await navigate("/editor.html"), "editor");
});

test("a full cache cannot interrupt an online fight or discard the fresh page and scripts", async () => {
  let handle;
  const full = () => { throw new Error("QuotaExceededError"); };
  const caches = { match: full, open: async () => ({ put: full }) };
  const self = { location: { origin: "https://game.test" }, addEventListener(type, fn) { if (type === "fetch") handle = fn; } };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self, caches, fetch: async () => new Response("fresh"), URL, Response,
  });
  for (const [path, mode] of [["/", "navigate"], ["/fight.js", "cors"], ["/assets/elchica.webp", "cors"]]) {
    const pending = [];
    let reply;
    handle({ request: { method: "GET", mode, url: "https://game.test" + path },
      waitUntil: task => pending.push(task), respondWith: task => { reply = task; } });
    assert.equal(await (await reply).text(), "fresh");
    await Promise.all(pending);
  }
});
