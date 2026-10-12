/* Node 25 has a localStorage of its own on the global object. Without a
   --localstorage-file it has no methods, and it hides the one jsdom gives each
   test file — so `localStorage.clear()` between tests threw, the tests after
   it saw the last test's screen, and 30 of them failed on a clean main.
   jsdom's own storage is put back, so tests run the same on any Node. */
declare const jsdom: { window: Window } | undefined;

for (const name of ["localStorage", "sessionStorage"] as const) {
  const own = typeof jsdom !== "undefined" ? jsdom.window[name] : undefined;
  if (own && typeof globalThis[name]?.clear !== "function") {
    Object.defineProperty(globalThis, name, { value: own, configurable: true, writable: true });
  }
}
