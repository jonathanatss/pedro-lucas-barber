import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
function loadModule(path, overrides = {}, globals = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  runInNewContext(outputText, {
    module: compiledModule, exports: compiledModule.exports,
    require: (name) => overrides[name] ?? loadDependency(name),
    ...globals,
  });
  return compiledModule.exports;
}
const validation = loadModule("../lib/booking/customer-validation.ts");
const validCustomer = {
  customerName: "Test Customer", customerPhone: "84999990000", customerEmail: "",
};

for (const [description, change, expected] of [
  ["empty name", { customerName: "" }, false],
  ["whitespace name", { customerName: "   " }, false],
  ["short name", { customerName: "Ab" }, false],
  ["empty phone", { customerPhone: "" }, false],
  ["whitespace phone", { customerPhone: "   " }, false],
  ["short phone", { customerPhone: "123" }, false],
  ["letters in phone", { customerPhone: "no phone" }, false],
  ["mask without digits", { customerPhone: "() ---- ----" }, false],
  ["masked phone", { customerPhone: "(84) 99999-0000" }, true],
  ["international phone", { customerPhone: "+55 (84) 99999-0000" }, true],
  ["both required fields complete", {}, true],
]) {
  test(`required customer fields: ${description}`, () => {
    assert.equal(validation.areRequiredCustomerFieldsValid({ ...validCustomer, ...change }), expected);
  });
}

test("email stays optional but is validated when provided", () => {
  assert.equal(Object.keys(validation.getBookingCustomerErrors(validCustomer)).length, 0);
  assert.ok(validation.getBookingCustomerErrors({ ...validCustomer, customerEmail: "invalid" }).customerEmail);
});

// Exercise actual component event handlers without a browser or external writes.
function setupForm(status = 400, response = {}, networkFailure = false) {
  const states = [];
  const focused = [];
  const requests = [];
  let cursor = 0;
  const Component = loadModule("../components/booking/BookingExperience.tsx", {
    "@/lib/booking/customer-validation": validation,
    "@/content/site": { siteContent: { businessName: "Barbershop", whatsappNumber: "5584999990000" } },
    "./BookingExperience.module.css": {},
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) {
          states[index] = typeof initial === "function" ? initial() : initial;
        }
        return [states[index], (value) => {
          states[index] = typeof value === "function" ? value(states[index]) : value;
        }];
      },
      useMemo: (callback) => callback(),
      useEffect() {},
    },
  }, {
    document: { getElementById: (id) => ({ focus: () => focused.push(id) }) },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      if (networkFailure) { throw new TypeError("Failed to fetch"); }
      return { ok: status < 400, status, json: async () => response };
    },
  }).default;
  const props = {
    businessHours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday, opensAt: "09:00", closesAt: "19:00", isClosed: weekday === 0,
    })),
    businessBreaks: [],
    services: [{ slug: "corte-de-cabelo", name: "Haircut", priceLabel: "R$ 35", durationMinutes: 40 }],
    timezone: "America/Sao_Paulo",
  };
  function render() { cursor = 0; return Component(props); }
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") { return undefined; }
    if (predicate(tree)) { return tree; }
    for (const child of [tree.props?.children].flat(Infinity)) {
      const result = find(child, predicate);
      if (result) { return result; }
    }
    return undefined;
  }
  function field(id) { return find(render(), (node) => node.props?.id === id); }
  function fill(id, value) { field(id).props.onChange({ target: { value } }); }
  render();
  return {
    requests, focused, fill, field,
    button: () => find(render(), (node) => node.type === "button" && node.props.type === "submit"),
    submit: () => find(render(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} }),
    html: () => renderToStaticMarkup(render()),
    selectTime: () => { states[4] = "09:40"; },
  };
}

test("button enables only with both required fields, and disables again when either is cleared", () => {
  const app = setupForm();
  assert.equal(app.button().props.disabled, true);
  app.fill("customer-name", validCustomer.customerName);
  assert.equal(app.button().props.disabled, true);
  app.fill("customer-phone", validCustomer.customerPhone);
  assert.equal(app.button().props.disabled, false);
  app.fill("customer-name", "   ");
  assert.equal(app.button().props.disabled, true);
  app.fill("customer-name", validCustomer.customerName);
  app.fill("customer-phone", "");
  assert.equal(app.button().props.disabled, true);
});

test("empty required fields cannot call the API even if submit is invoked directly", async () => {
  const app = setupForm();
  await app.submit();
  assert.equal(app.requests.length, 0);
  assert.equal(app.focused[0], "customer-name");
  assert.doesNotMatch(app.html(), /Enviar pedido pelo WhatsApp/);
});

test("invalid optional email blocks submission without losing the required fields", async () => {
  const app = setupForm();
  app.fill("customer-name", validCustomer.customerName);
  app.fill("customer-phone", validCustomer.customerPhone);
  app.fill("customer-email", "invalid");
  await app.submit();
  assert.equal(app.requests.length, 0);
  assert.equal(app.focused[0], "customer-email");
  assert.equal(app.field("customer-name").props.value, validCustomer.customerName);
  assert.doesNotMatch(app.html(), /Enviar pedido pelo WhatsApp/);
});

test("network failure reports an unconfirmed outcome instead of asserting the booking failed", async () => {
  const app = setupForm(500, {}, true);
  app.fill("customer-name", validCustomer.customerName);
  app.fill("customer-phone", validCustomer.customerPhone);
  app.selectTime();
  await app.submit();
  assert.match(app.html(), /verificar se a reserva foi registrada/);
  assert.match(app.html(), /Enviar pedido pelo WhatsApp/);
  assert.doesNotMatch(app.html(), /confirma\u00e7\u00e3o autom\u00e1tica falhou/);
});

test("successful booking resets required fields and disables the button again", async () => {
  const app = setupForm(201, {
    appointmentId: "test", serviceName: "Haircut", syncStatus: "confirmed",
    start: "2026-09-17T12:40:00.000Z", end: "2026-09-17T13:20:00.000Z",
    timezone: "America/Sao_Paulo",
  });
  app.fill("customer-name", validCustomer.customerName);
  app.fill("customer-phone", validCustomer.customerPhone);
  app.selectTime();
  await app.submit();
  assert.equal(app.button().props.disabled, true);
  assert.equal(app.field("customer-name").props.value, "");
  assert.equal(app.field("customer-phone").props.value, "");
  assert.equal(app.field("customer-name").props["aria-invalid"], false);
  assert.match(app.html(), /Agendamento confirmado/);
  assert.doesNotMatch(app.html(), /Enviar pedido pelo WhatsApp/);
});

test("errors show on blur and clear after the field is corrected", () => {
  const app = setupForm();
  assert.equal(app.field("customer-phone").props["aria-invalid"], false);
  app.field("customer-phone").props.onBlur();
  assert.equal(app.field("customer-phone").props["aria-invalid"], true);
  assert.match(app.html(), /id="customer-phone-error"/);
  app.fill("customer-phone", validCustomer.customerPhone);
  assert.equal(app.field("customer-phone").props["aria-invalid"], false);
});

for (const status of [400, 409, 500]) {
  test(`HTTP ${status} ${status === 500 ? "offers" : "does not offer"} manual WhatsApp recovery`, async () => {
    const app = setupForm(status, {
      error: "Request rejected",
      ...(status === 400 ? { details: { fieldErrors: { customerPhone: ["Check phone"] } } } : {}),
      ...(status === 409 ? { code: "slot_unavailable" } : {}),
    });
    app.fill("customer-name", validCustomer.customerName);
    app.fill("customer-phone", validCustomer.customerPhone);
    app.selectTime();
    await app.submit();
    assert.equal(app.requests.length, 1);
    assert.equal(app.html().includes("Enviar pedido pelo WhatsApp"), status === 500);
    if (status === 400) {
      assert.match(app.html(), /Check phone/);
      assert.equal(app.focused[0], "customer-phone");
      assert.equal(app.field("customer-name").props.value, validCustomer.customerName);
    }
  });
}
