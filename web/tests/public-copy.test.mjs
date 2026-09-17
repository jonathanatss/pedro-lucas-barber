import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
function loadModule(path, overrides = {}, globals = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  });
  runInNewContext(outputText, {
    module: compiledModule, exports: compiledModule.exports,
    require: (name) => overrides[name] ?? loadDependency(name), URL,
    ...globals,
  });
  return compiledModule.exports;
}

const publicErrors = loadModule("../lib/public-errors.ts");
const privateMessage = "Supabase migration appointments SUPABASE_SERVICE_ROLE_KEY Netlify Asaas API key";
class DomainError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
const nextServer = { NextResponse: { json: (body, options = {}) => ({ body, ...options }) } };

for (const [name, path, dependency, method, errorClass, cases] of [
  ["booking", "../app/api/appointments/route.ts", "@/lib/booking/create-appointment", "createAppointment", "BookingError", [
    ["slot_in_past", 409, /já passou/],
    ["slot_unavailable", 409, /não está mais disponível/],
    ["slot_conflict", 409, /não está mais disponível/],
    ["invalid_service", 400, /serviço disponível/],
    ["supabase_not_configured", 503, /WhatsApp antes de tentar novamente/],
    ["insert_failed", 500, /WhatsApp antes de tentar novamente/],
  ]],
  ["membership", "../app/api/asaas/checkout/route.ts", "@/lib/asaas/checkout", "createMembershipCheckout", "MembershipCheckoutError", [
    ["invalid_plan", 400, /plano disponível/],
    ["supabase_not_configured", 503, /fale com a barbearia/],
    ["membership_insert_failed", 500, /fale com a barbearia/],
    ["asaas_checkout_failed", 401, /fale com a barbearia/],
  ]],
]) {
  for (const [code, status, expected] of cases) {
    test(`${name} ${code}: public response hides diagnostics and preserves HTTP status`, async () => {
      const logs = [];
      const route = loadModule(path, {
        "next/server": nextServer, "@/lib/public-errors": publicErrors,
        [dependency]: {
          [errorClass]: DomainError,
          [method]: async () => { throw new DomainError(privateMessage, status, code); },
        },
      }, { console: { error: (...args) => logs.push(args) } });
      const result = await route.POST({ json: async () => ({}) });
      assert.equal(result.status, status);
      assert.equal(result.body.code, code);
      assert.match(result.body.error, expected);
      assert.doesNotMatch(JSON.stringify(result.body), /Supabase|migration|SERVICE_ROLE|Netlify|API key/);
      if (status >= 500 || code === "asaas_checkout_failed") {
        assert.ok(JSON.stringify(logs).includes(privateMessage), "diagnostics remain in server logs");
      }
    });
  }

  test(`${name}: unexpected failures do not expose exception messages`, async () => {
    const route = loadModule(path, {
      "next/server": nextServer, "@/lib/public-errors": publicErrors,
      [dependency]: {
        [errorClass]: DomainError,
        [method]: async () => { throw new Error(privateMessage); },
      },
    }, { Error, console: { error() {} } });
    const result = await route.POST({ json: async () => ({}) });
    assert.equal(result.status, 500);
    assert.doesNotMatch(JSON.stringify(result.body), /Supabase|migration|SERVICE_ROLE|Netlify|API key/);
  });
}

test("availability errors are actionable and do not expose provider messages", async () => {
  const route = loadModule("../app/api/availability/route.ts", {
    "next/server": nextServer,
    "@/lib/booking/availability": {
      getAvailabilityForDate: async () => { throw new Error(privateMessage); },
    },
  }, { Error, console: { error() {} } });
  const result = await route.GET({ url: "https://example.com/api/availability?date=2026-09-17&service=corte" });
  assert.equal(result.status, 400);
  assert.equal(result.headers["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(result.body.error, "Não foi possível carregar os horários. Tente novamente.");
  const missing = await route.GET({ url: "https://example.com/api/availability" });
  assert.equal(missing.body.error, "Escolha um serviço e uma data.");
});

test("membership form keeps price and recurring billing disclosure without technical explanations", () => {
  const Component = loadModule("../components/memberships/MembershipCheckout.tsx", {
    "./MembershipCheckout.module.css": {},
    "@/lib/asaas/plans": { formatPriceCents: () => "R$ 69,90" },
  }).default;
  const html = renderToStaticMarkup(createElement(Component, { plans: [{
    slug: "corte", name: "Corte Mensal", priceCents: 6990,
    description: "Seu corte mensal", benefits: ["1 corte por mês"],
  }] }));
  assert.match(html, /Assinar plano mensal/);
  assert.match(html, /Cobrança automática mensal no cartão/);
  assert.match(html, /R\$ 69,90/);
  assert.match(html, /1 corte por mês/);
  assert.doesNotMatch(html, /<h1\b|checkout|sistema|operacional|Supabase/);
});

test("landing page retains customer content without developer placeholders or migration announcements", () => {
  const html = readFileSync(new URL("../public/legacy/index.html", import.meta.url), "utf8");
  const visibleText = html.replace(/<!--[^]*?-->/g, "").replace(/<[^>]*>/g, " ");
  assert.doesNotMatch(visibleText, /Insira o endereço|Cole o iframe|Incorporar mapa|Nosso agendamento agora|checkout|18h/);
  assert.match(visibleText, /Como chegar/);
  assert.match(visibleText, /Consultar endereço pelo WhatsApp/);
  assert.match(visibleText, /9h às 12h e 13h às 19h/);
  assert.match(html, /src="\/agendar\?embedded=1"/);
  assert.match(html, /data:image\/jpeg;base64,/);
  assert.match(html, /id="servicos"/);
  assert.match(html, /id="faq"/);
});
