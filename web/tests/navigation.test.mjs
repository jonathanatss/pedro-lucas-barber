import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
function loadModule(path, overrides = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  });
  runInNewContext(outputText, {
    module: compiledModule, exports: compiledModule.exports,
    require: (name) => overrides[name] ?? loadDependency(name),
  });
  return compiledModule.exports;
}

function Link(props) {
  const anchorProps = { ...props };
  delete anchorProps.prefetch;
  return createElement("a", anchorProps);
}
const navigation = loadModule("../lib/navigation.ts");
const common = {
  "next/link": Link,
  "@/lib/navigation": navigation,
  "@/content/site": { siteContent: { businessName: "Pedro Lucas Barbearia", city: "Natal", state: "RN" } },
};
const header = loadModule("../components/Header.tsx", common);
const footer = loadModule("../components/Footer.tsx", common);
const sharedComponents = { ...common, "@/components/Header": header, "@/components/Footer": footer };
const catalog = { services: [], businessHours: [], businessBreaks: [], timezone: "America/Sao_Paulo" };
const bookingPage = loadModule("../app/agendar/page.tsx", {
  ...sharedComponents,
  "../globals.css": {},
  "@/lib/booking/catalog": { getBookingCatalog: async () => catalog },
  "@/components/booking/BookingExperience": ({ embedded }) =>
    createElement("section", { "data-embedded": embedded }, "Booking form"),
}).default;

function assertNavigation(html) {
  assert.match(html, /aria-label="Navegação principal"/);
  assert.match(html, /aria-label="Navegação do rodapé"/);
  for (const path of ["/legacy/index.html", "/agendar", "/clube", "/admin/agenda"]) {
    assert.ok(html.includes(`href="${path}"`), `clickable path: ${path}`);
  }
  assert.doesNotMatch(html, /href="\/#/);
}

test("standalone booking has a visible route home and shared navigation", async () => {
  const html = renderToStaticMarkup(await bookingPage({ searchParams: Promise.resolve({}) }));
  assertNavigation(html);
  assert.match(html, /<a class="back-link" href="\/legacy\/index.html">Voltar para o início<\/a>/);
  assert.match(html, /href="\/agendar" aria-current="page"/);
});

test("embedded booking does not duplicate navigation inside the landing page", async () => {
  const html = renderToStaticMarkup(await bookingPage({ searchParams: Promise.resolve({ embedded: "1" }) }));
  assert.match(html, /data-embedded="true"/);
  assert.doesNotMatch(html, /<header|<footer|Voltar para o início|site-navigation/);
});

for (const [name, path, overrides] of [
  ["club", "../app/clube/page.tsx", {
    "@/lib/asaas/plans": { getMembershipPlans: async () => [] },
    "@/components/memberships/MembershipCheckout": () => createElement("section", null, "Checkout form"),
  }],
  ["subscription confirmation", "../app/clube/sucesso/page.tsx", {}],
  ["admin agenda", "../app/admin/agenda/page.tsx", {
    "../../globals.css": {},
    "@/components/admin/AgendaAdminPanel": () => createElement("main", null, "Login required"),
  }],
  ["404", "../app/not-found.tsx", {}],
]) {
  test(`${name} has clickable routes without using browser history or typing a URL`, async () => {
    const Page = loadModule(path, { ...sharedComponents, ...overrides }).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    assertNavigation(html);
  });
}

test("landing page navigation targets existing pages and section IDs", () => {
  const html = readFileSync(new URL("../public/legacy/index.html", import.meta.url), "utf8");
  const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));
  const paths = new Set(Object.values(navigation.siteRoutes).map((path) => path.split("#")[0]));
  const hrefs = Array.from(html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g), (match) => match[1]);
  for (const href of hrefs) {
    if (href.startsWith("#")) { assert.ok(ids.has(href.slice(1)), `existing section: ${href}`); }
    if (href.startsWith("/")) { assert.ok(paths.has(href.split("?")[0]), `existing page: ${href}`); }
  }
  for (const href of ["/agendar", "/clube", "/admin/agenda"]) { assert.ok(hrefs.includes(href)); }
  const mobileMenu = html.match(/<nav class="mobile-menu"[^]*?<\/nav>/)[0];
  assert.match(mobileMenu, /href="\/agendar"/);
  assert.match(mobileMenu, /href="\/clube"/);
  for (const href of [navigation.siteRoutes.services, navigation.siteRoutes.contact]) {
    assert.ok(ids.has(href.split("#")[1]), `cross-page link section exists: ${href}`);
  }
});

test("mobile menu opens, closes on navigation and supports Escape with focus restoration", () => {
  let isOpen = false;
  let focused = false;
  const Header = loadModule("../components/Header.tsx", {
    ...common,
    react: {
      useState: () => [isOpen, (value) => { isOpen = typeof value === "function" ? value(isOpen) : value; }],
      useRef: () => ({ current: { focus: () => { focused = true; } } }),
    },
  }).Header;
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") { return undefined; }
    if (predicate(tree)) { return tree; }
    for (const child of [tree.props?.children].flat(Infinity)) {
      const match = find(child, predicate);
      if (match) { return match; }
    }
  }
  const menu = () => find(Header({}), (node) => node.type === "button");
  const nav = () => find(Header({}), (node) => node.type === "nav");
  assert.equal(menu().props["aria-expanded"], false);
  assert.equal(menu().props["aria-controls"], nav().props.id);
  menu().props.onClick();
  assert.equal(menu().props["aria-expanded"], true);
  assert.match(nav().props.className, /nav-open/);
  find(nav(), (node) => node.props?.href === "/agendar").props.onClick();
  assert.equal(menu().props["aria-expanded"], false);
  menu().props.onClick();
  nav().props.onKeyDown({ key: "Escape" });
  assert.equal(menu().props["aria-expanded"], false);
  assert.equal(focused, true);
});
