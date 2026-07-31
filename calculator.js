(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketplaceCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function normalize(raw) {
    return {
      price: Math.max(0, toNumber(raw.price)),
      orders: Math.max(0, toNumber(raw.orders)),
      buyoutRate: clamp(toNumber(raw.buyoutRate), 1, 100),
      cost: Math.max(0, toNumber(raw.cost)),
      commissionRate: clamp(toNumber(raw.commissionRate), 0, 100),
      forwardLogistics: Math.max(0, toNumber(raw.forwardLogistics)),
      returnLogistics: Math.max(0, toNumber(raw.returnLogistics)),
      otherVariable: Math.max(0, toNumber(raw.otherVariable)),
      ads: Math.max(0, toNumber(raw.ads)),
      team: Math.max(0, toNumber(raw.team)),
      infrastructure: Math.max(0, toNumber(raw.infrastructure)),
      otherFixed: Math.max(0, toNumber(raw.otherFixed)),
      taxRate: clamp(toNumber(raw.taxRate), 0, 100),
      credits: Math.max(0, toNumber(raw.credits)),
      targetProfit: Math.max(0, toNumber(raw.targetProfit))
    };
  }

  function calculate(raw) {
    const input = normalize(raw);
    const buyout = input.buyoutRate / 100;
    const sales = input.orders * buyout;
    const returns = Math.max(0, input.orders - sales);
    const revenue = input.price * sales;
    const cogs = input.cost * sales;
    const commission = revenue * input.commissionRate / 100;
    const forwardLogisticsTotal = input.forwardLogistics * input.orders;
    const returnLogisticsTotal = input.returnLogistics * returns;
    const otherVariableTotal = input.otherVariable * sales;
    const logisticsTotal = forwardLogisticsTotal + returnLogisticsTotal;
    const variableTotal = cogs + commission + logisticsTotal + otherVariableTotal;
    const contributionTotal = revenue - variableTotal;
    const contributionUnit = sales > 0 ? contributionTotal / sales : 0;
    const contributionMargin = revenue > 0 ? contributionTotal / revenue * 100 : 0;
    const fixedTotal = input.ads + input.team + input.infrastructure + input.otherFixed;
    const operatingProfit = contributionTotal - fixedTotal;
    const tax = revenue * input.taxRate / 100;
    const netProfit = operatingProfit - tax - input.credits;
    const netMargin = revenue > 0 ? netProfit / revenue * 100 : 0;
    const drr = revenue > 0 ? input.ads / revenue * 100 : 0;

    const effectiveLogisticsUnit = sales > 0 ? logisticsTotal / sales : 0;
    const priceContributionRate = 1 - input.commissionRate / 100 - input.taxRate / 100;
    const nonPriceVariableUnit = input.cost + input.otherVariable + effectiveLogisticsUnit;
    const fixedForNet = fixedTotal + input.credits;
    const netContributionUnit = input.price * priceContributionRate - nonPriceVariableUnit;
    const breakEvenSales = netContributionUnit > 0 ? Math.ceil(fixedForNet / netContributionUnit) : Infinity;
    const breakEvenOrders = Number.isFinite(breakEvenSales) ? Math.ceil(breakEvenSales / buyout) : Infinity;
    const targetSales = netContributionUnit > 0 ? Math.ceil((fixedForNet + input.targetProfit) / netContributionUnit) : Infinity;
    const breakEvenPrice = sales > 0 && priceContributionRate > 0
      ? (nonPriceVariableUnit + fixedForNet / sales) / priceContributionRate
      : Infinity;
    const maxDiscount = input.price > 0 && Number.isFinite(breakEvenPrice)
      ? Math.max(0, (input.price - breakEvenPrice) / input.price * 100)
      : 0;

    const expenses = [
      { key: "cogs", label: "Себестоимость", value: cogs },
      { key: "commission", label: "Комиссия", value: commission },
      { key: "logistics", label: "Логистика", value: logisticsTotal },
      { key: "otherVariable", label: "Упаковка и прочее", value: otherVariableTotal },
      { key: "ads", label: "Реклама", value: input.ads },
      { key: "fixed", label: "Команда и сервисы", value: input.team + input.infrastructure + input.otherFixed },
      { key: "tax", label: "Налоги и списания", value: tax + input.credits }
    ];

    const largestExpense = expenses.reduce((largest, item) => item.value > largest.value ? item : largest, expenses[0]);

    return {
      input, buyout, sales, returns, revenue, cogs, commission,
      forwardLogisticsTotal, returnLogisticsTotal, logisticsTotal,
      otherVariableTotal, variableTotal, contributionTotal,
      contributionUnit, contributionMargin, fixedTotal, operatingProfit,
      tax, netProfit, netMargin, drr, effectiveLogisticsUnit,
      netContributionUnit, breakEvenSales, breakEvenOrders, targetSales,
      breakEvenPrice, maxDiscount, expenses, largestExpense
    };
  }

  function applyScenario(raw, scenario) {
    const next = { ...normalize(raw) };
    next.price *= 1 + toNumber(scenario.pricePct) / 100;
    next.orders *= 1 + toNumber(scenario.ordersPct) / 100;
    next.commissionRate += toNumber(scenario.commissionPoints);
    next.ads *= 1 + toNumber(scenario.adsPct) / 100;
    return calculate(next);
  }

  return { calculate, applyScenario, normalize };
});
