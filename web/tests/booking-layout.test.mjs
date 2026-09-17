import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
const customerSource = readFileSync(new URL("../lib/booking/customer-validation.ts", import.meta.url), "utf8");
const customerModule = { exports: {} };
runInNewContext(ts.transpileModule(customerSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, {
  module: customerModule, exports: customerModule.exports, require: loadDependency,
});
const filename = fileURLToPath(new URL("../components/booking/BookingExperience.tsx", import.meta.url));
const source = readFileSync(filename, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
});
const compiledModule = { exports: {} };
runInNewContext(outputText, {
  module: compiledModule,
  exports: compiledModule.exports,
  require: (name) => {
    if (name === "@/lib/booking/customer-validation") {
      return customerModule.exports;
    }
    if (name.endsWith(".module.css")) {
      return { layout: "booking-layout", panel: "booking-panel" };
    }
    if (name === "@/content/site") {
      return { siteContent: { businessName: "Barbershop", whatsappNumber: "5584999990000" } };
    }
    return loadDependency(name);
  },
}, { filename });
const BookingExperience = compiledModule.exports.default;

const props = {
  businessBreaks: [{ startsAt: "12:00", endsAt: "13:00" }],
  businessHours: Array.from({ length: 7 }, (_, weekday) => ({
    weekday, opensAt: "09:00", closesAt: "19:00", isClosed: weekday === 0,
  })),
  services: [{
    slug: "corte-de-cabelo",
    name: "Corte de Cabelo",
    description: "Haircut",
    priceLabel: "R$ 35",
    durationMinutes: 40,
  }],
  timezone: "America/Sao_Paulo",
};

for (const embedded of [false, true]) {
  test(`public booking ${embedded ? "embedded" : "standalone"} renders only the booking card`, () => {
    const html = renderToStaticMarkup(createElement(BookingExperience, { ...props, embedded }));

    assert.doesNotMatch(html, /<aside\b|Resumo operacional|Timezone|Dias cadastrados|Regras do slot/);
    assert.equal((html.match(/class="booking-panel"/g) ?? []).length, 1);
    assert.match(html, /Monte seu agendamento/);
    assert.match(html, /Corte de Cabelo/);
    assert.match(html, /R\$ 35/);
    assert.match(html, /<form\b/);
    assert.match(html, /id="booking-date"/);
    assert.match(html, /id="customer-name"/);
    assert.match(html, /Confirmar agendamento/);
    assert.match(html, /Nome completo \(obrigat\u00f3rio\)/);
    assert.match(html, /WhatsApp com DDD \(obrigat\u00f3rio\)/);
    assert.match(html, /<input[^>]*id="customer-name"[^>]*required=""/);
    assert.match(html, /<input[^>]*id="customer-phone"[^>]*required=""/);
    assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/);
    assert.match(html, /id="booking-submit-hint"/);
    assert.equal(html.includes("<h1"), !embedded);
  });
}
