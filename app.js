(function () {
  "use strict";

  const inputIds = [
    "price", "orders", "buyoutRate", "cost", "commissionRate",
    "forwardLogistics", "returnLogistics", "otherVariable", "ads",
    "team", "infrastructure", "otherFixed", "taxRate", "credits", "targetProfit"
  ];
  const scenarioIds = ["scenarioPrice", "scenarioOrders", "scenarioCommission", "scenarioAds"];
  const defaults = Object.fromEntries(inputIds.map((id) => [id, document.getElementById(id).value]));

  const rubles = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const money = (value) => `${value < 0 ? "−" : ""}${rubles.format(Math.abs(value))} ₽`;
  const units = (value) => Number.isFinite(value) ? `${number.format(value)} шт.` : "Недостижимо";
  const pct = (value) => `${percent.format(value)}%`;
  const getValue = (id) => Number(document.getElementById(id).value) || 0;
  const setText = (id, value) => { document.getElementById(id).textContent = value; };

  function readInputs() {
    return Object.fromEntries(inputIds.map((id) => [id, getValue(id)]));
  }

  function stateFor(result) {
    if (result.netProfit < 0) return "negative";
    if (result.netMargin < 10 || result.input.buyoutRate < 65) return "warning";
    return "positive";
  }

  function diagnosisFor(result) {
    const state = stateFor(result);
    const marketplace = document.getElementById("marketplace").selectedOptions[0].textContent;
    const largestShare = result.revenue > 0 ? result.largestExpense.value / result.revenue * 100 : 0;
    let lead;

    if (state === "negative") {
      lead = `При текущих данных продажи на ${marketplace} приносят <strong>убыток ${money(Math.abs(result.netProfit))} в месяц</strong>.`;
    } else if (state === "warning") {
      lead = `Бизнес остаётся в плюсе, но запас прочности небольшой: чистая рентабельность составляет <strong>${pct(result.netMargin)}</strong>.`;
    } else {
      lead = `Расчётная чистая прибыль составляет <strong>${money(result.netProfit)} в месяц</strong>. До масштабирования проверьте исходные данные по отчёту площадки.`;
    }

    const buyoutNote = result.input.buyoutRate < 70
      ? ` Процент выкупа ${pct(result.input.buyoutRate)} заметно увеличивает стоимость логистики.`
      : "";
    return `${lead} Самая крупная статья расходов — <strong>${result.largestExpense.label.toLowerCase()}</strong> (${pct(largestShare)} выручки).${buyoutNote}`;
  }

  function renderBars(result) {
    const container = document.getElementById("waterfallBars");
    const rows = result.expenses.concat([{
      key: result.netProfit >= 0 ? "profit" : "loss",
      label: result.netProfit >= 0 ? "Чистая прибыль" : "Чистый убыток",
      value: Math.abs(result.netProfit)
    }]);
    const base = Math.max(result.revenue, ...rows.map((item) => item.value), 1);
    container.innerHTML = rows.map((item) => {
      const modifier = item.key === "profit" ? " bar-fill--profit" : item.key === "loss" ? " bar-fill--loss" : "";
      const width = Math.min(100, item.value / base * 100);
      return `<div class="bar-row">
        <span class="bar-label" title="${item.label}">${item.label}</span>
        <div class="bar-track"><div class="bar-fill${modifier}" style="width:${width}%"></div></div>
        <span class="bar-value">${money(item.value)}</span>
      </div>`;
    }).join("");
  }

  function updateTelegramLink(result) {
    const marketplace = document.getElementById("marketplace").selectedOptions[0].textContent;
    const message = [
      "Здравствуйте, Ольга! Хочу проверить расчёт юнит-экономики.",
      `Площадка: ${marketplace}.`,
      `Выручка: ${money(result.revenue)}, чистая прибыль: ${money(result.netProfit)}, рентабельность: ${pct(result.netMargin)}.`
    ].join(" ");
    document.getElementById("telegramLink").href = `https://t.me/DanilovaOlga44?text=${encodeURIComponent(message)}`;
  }

  function render() {
    const result = MarketplaceCalc.calculate(readInputs());
    const state = stateFor(result);
    const badge = document.getElementById("statusBadge");
    badge.dataset.state = state;
    badge.textContent = state === "negative" ? "Бизнес в минусе" : state === "warning" ? "Зона внимания" : "Есть запас прибыли";

    setText("salesHint", `Фактических продаж: ${number.format(result.sales)}`);
    setText("drrHint", `ДРР: ${pct(result.drr)}`);
    setText("netProfit", money(result.netProfit));
    setText("netMargin", `чистая рентабельность ${pct(result.netMargin)}`);
    setText("contributionUnit", money(result.contributionUnit));
    setText("contributionMargin", `${pct(result.contributionMargin)} от цены`);
    setText("breakEvenSales", units(result.breakEvenSales));
    setText("breakEvenOrders", Number.isFinite(result.breakEvenOrders) ? `${number.format(result.breakEvenOrders)} заказов при текущем выкупе` : "Продажа не покрывает переменные расходы");
    setText("sales", units(result.sales));
    setText("breakEvenPrice", Number.isFinite(result.breakEvenPrice) ? money(result.breakEvenPrice) : "Недостижимо");
    setText("maxDiscount", result.maxDiscount > 0 ? pct(result.maxDiscount) : "Запаса нет");
    setText("targetSales", units(result.targetSales));
    setText("revenueValue", money(result.revenue));

    const diagnosis = document.getElementById("diagnosis");
    diagnosis.className = `diagnosis${state === "positive" ? "" : ` ${state}`}`;
    diagnosis.innerHTML = diagnosisFor(result);

    renderBars(result);
    updateTelegramLink(result);
    renderScenario(result);
  }

  function readScenario() {
    return {
      pricePct: getValue("scenarioPrice"),
      ordersPct: getValue("scenarioOrders"),
      commissionPoints: getValue("scenarioCommission"),
      adsPct: getValue("scenarioAds")
    };
  }

  function renderScenario(baseResult) {
    const scenario = readScenario();
    const result = MarketplaceCalc.applyScenario(readInputs(), scenario);
    const diff = result.netProfit - baseResult.netProfit;
    setText("scenarioNet", money(result.netProfit));
    setText("scenarioDifference", `${diff >= 0 ? "+" : "−"}${money(Math.abs(diff))} к текущей прибыли`);

    let conclusion = "Сценарий не отличается от текущего расчёта.";
    if (Math.abs(diff) >= 1) {
      conclusion = diff > 0
        ? `Изменение увеличит прибыль на ${money(diff)}. Проверьте, реалистичны ли рост заказов и сохранение процента выкупа.`
        : `Изменение заберёт ${money(Math.abs(diff))} прибыли. Оцените, сможете ли вы компенсировать это объёмом продаж.`;
    }
    if (result.netProfit < 0) conclusion += " По этому сценарию бизнес становится убыточным.";
    setText("scenarioConclusion", conclusion);
  }

  function setScenario(values) {
    document.getElementById("scenarioPrice").value = values.pricePct || 0;
    document.getElementById("scenarioOrders").value = values.ordersPct || 0;
    document.getElementById("scenarioCommission").value = values.commissionPoints || 0;
    document.getElementById("scenarioAds").value = values.adsPct || 0;
    render();
  }

  inputIds.forEach((id) => document.getElementById(id).addEventListener("input", render));
  scenarioIds.forEach((id) => document.getElementById(id).addEventListener("input", render));
  document.getElementById("marketplace").addEventListener("change", render);

  document.getElementById("resetButton").addEventListener("click", () => {
    Object.entries(defaults).forEach(([id, value]) => { document.getElementById(id).value = value; });
    setScenario({});
  });

  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.scenario;
      if (type === "discount") setScenario({ pricePct: -10 });
      if (type === "growth") setScenario({ ordersPct: 20 });
      if (type === "commission") setScenario({ commissionPoints: 2 });
      if (type === "reset") setScenario({});
    });
  });

  document.getElementById("printButton").addEventListener("click", () => window.print());
  render();
})();
