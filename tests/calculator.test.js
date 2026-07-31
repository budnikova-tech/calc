const assert = require("node:assert/strict");
const test = require("node:test");
const { calculate, applyScenario } = require("../calculator.js");

const example = {
  price: 2500,
  orders: 1500,
  buyoutRate: 75,
  cost: 600,
  commissionRate: 15,
  forwardLogistics: 100,
  returnLogistics: 70,
  otherVariable: 50,
  ads: 100000,
  team: 150000,
  infrastructure: 50000,
  otherFixed: 20000,
  taxRate: 6,
  credits: 0,
  targetProfit: 200000
};

test("calculates sales and returns from buyout rate", () => {
  const result = calculate(example);
  assert.equal(result.sales, 1125);
  assert.equal(result.returns, 375);
});

test("calculates the monthly profit waterfall", () => {
  const result = calculate(example);
  assert.equal(result.revenue, 2812500);
  assert.equal(result.cogs, 675000);
  assert.equal(result.commission, 421875);
  assert.equal(result.logisticsTotal, 176250);
  assert.equal(result.otherVariableTotal, 56250);
  assert.equal(result.netProfit, 994375);
});

test("break-even outputs are finite when each sale contributes", () => {
  const result = calculate(example);
  assert.equal(result.breakEvenSales, 274);
  assert.equal(result.breakEvenOrders, 366);
  assert.ok(result.breakEvenPrice > 1300 && result.breakEvenPrice < 1400);
  assert.ok(result.maxDiscount > 44 && result.maxDiscount < 45);
});

test("a ten percent discount reduces profit", () => {
  const base = calculate(example);
  const discounted = applyScenario(example, { pricePct: -10 });
  assert.ok(discounted.netProfit < base.netProfit);
  assert.equal(discounted.input.price, 2250);
});

test("invalid and negative inputs are normalized safely", () => {
  const result = calculate({ ...example, orders: -2, price: "bad", buyoutRate: 500 });
  assert.equal(result.input.orders, 0);
  assert.equal(result.input.price, 0);
  assert.equal(result.input.buyoutRate, 100);
  assert.equal(result.revenue, 0);
});
