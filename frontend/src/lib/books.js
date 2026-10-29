// frontend/src/lib/books.js — accounting, Florida tax and payroll helpers.
// The database is the source of truth for posted numbers; these helpers are
// for previews, due dates, estimates and exports. All figures are estimates:
// confirm with your CPA before filing.

export const r2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON * 100) / 100;
export const n0 = (v) => {
  const x = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export const CPA_NOTE = "Estimate — confirm with your CPA before filing.";

// ---------------------------------------------------------------- accounts
export const TYPE_LABEL = { asset: "Assets", liability: "Liabilities", equity: "Owner's equity", income: "Income", cogs: "Cost of sales", expense: "Expenses" };
export const DEBIT_NORMAL = new Set(["asset", "cogs", "expense"]);
export const balanceOf = (a) => (DEBIT_NORMAL.has(a.type) ? Number(a.debit) - Number(a.credit) : Number(a.credit) - Number(a.debit));

// Plain-English categories for snapping receipts (account code → label).
export const EXPENSE_CATEGORIES = [
  { code: "5000", label: "Parts & materials (for a job)", key: "parts" },
  { code: "1200", label: "Parts for stock (inventory)", key: "parts_stock" },
  { code: "5010", label: "Sublet (outside shop)", key: "sublet" },
  { code: "6000", label: "Rent", key: "rent" },
  { code: "6010", label: "Utilities", key: "utilities" },
  { code: "6020", label: "Tools & small equipment", key: "tools" },
  { code: "1500", label: "Equipment over $2,500 (depreciate)", key: "equipment" },
  { code: "6030", label: "Insurance", key: "insurance" },
  { code: "6040", label: "Advertising", key: "advertising" },
  { code: "6050", label: "Software & subscriptions", key: "software" },
  { code: "6060", label: "Repairs & maintenance", key: "repairs" },
  { code: "6070", label: "Licenses & fees", key: "licenses" },
  { code: "6080", label: "Contract labor", key: "contract_labor" },
  { code: "6100", label: "Office", key: "office" },
  { code: "6110", label: "Vehicle expense (gas, tolls)", key: "vehicle" },
  { code: "6120", label: "Meals (50%)", key: "meals" },
  { code: "6130", label: "Bank & card fees", key: "bank_fees" },
  { code: "6160", label: "Shop supplies", key: "shop_supplies" },
  { code: "6150", label: "Interest", key: "interest" },
  { code: "6900", label: "Other", key: "other" },
  { code: "3100", label: "Owner draw (personal)", key: "draw" },
  { code: "2400", label: "Loan payment (principal)", key: "loan" },
  { code: "2200", label: "Payroll tax deposit", key: "payroll_tax" },
];
export const categoryByKey = (k) => EXPENSE_CATEGORIES.find((c) => c.key === k) || EXPENSE_CATEGORIES.at(-4);
// Categories the shop uses up itself — untaxed purchases of these owe use tax.
export const USE_TAX_CODES = new Set(["6020", "1500", "6060", "6100", "6160", "6900"]);

export const PAID_FROM = [
  { code: "1010", label: "Business checking" },
  { code: "1000", label: "Cash" },
  { code: "2300", label: "Business credit card" },
  { code: "3000", label: "Owner paid personally" },
];

// ---------------------------------------------------------------- Florida sales tax
export const FL_COUNTIES = [
  "Alachua","Baker","Bay","Bradford","Brevard","Broward","Calhoun","Charlotte","Citrus","Clay","Collier","Columbia",
  "DeSoto","Dixie","Duval","Escambia","Flagler","Franklin","Gadsden","Gilchrist","Glades","Gulf","Hamilton","Hardee",
  "Hendry","Hernando","Highlands","Hillsborough","Holmes","Indian River","Jackson","Jefferson","Lafayette","Lake","Lee",
  "Leon","Levy","Liberty","Madison","Manatee","Marion","Martin","Miami-Dade","Monroe","Nassau","Okaloosa","Okeechobee",
  "Orange","Osceola","Palm Beach","Pasco","Pinellas","Polk","Putnam","St. Johns","St. Lucie","Santa Rosa","Sarasota",
  "Seminole","Sumter","Suwannee","Taylor","Union","Volusia","Wakulla","Walton","Washington",
];

export const FEE_CODES = [
  { code: "shop_supplies", label: "Shop supplies" },
  { code: "disposal", label: "Environmental / disposal" },
  { code: "tire", label: "FL new tire fee" },
  { code: "battery", label: "FL battery fee" },
  { code: "towing", label: "Towing" },
  { code: "other", label: "Other fee" },
];

// Same rule the database uses (public.item_taxable).
export function itemTaxable(kind, feeCode, hasParts, exempt, fees = {}) {
  if (exempt) return false;
  if (kind === "part") return true;
  if (kind === "labor" || kind === "sublet") return hasParts;
  if (kind === "fee") {
    const t = fees?.[feeCode || "other"]?.tax || "follow_job";
    return t === "always" ? true : t === "never" ? false : hasParts;
  }
  return false;
}

// Suggested sell price from cost using the markup matrix [{upto, markup%}].
export function priceFromMatrix(cost, matrix = []) {
  const c = n0(cost);
  if (!c) return 0;
  const tier = matrix.find((t) => t.upto == null || c <= Number(t.upto)) || matrix.at(-1);
  return r2(c * (1 + (Number(tier?.markup) || 0) / 100));
}

// ---------------------------------------------------------------- dates & holidays
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const toDay = ymd;

function nthWeekday(year, month, weekday, n) {
  const d = new Date(year, month, 1);
  const shift = (weekday - d.getDay() + 7) % 7;
  return new Date(year, month, 1 + shift + (n - 1) * 7);
}
function lastWeekday(year, month, weekday) {
  const d = new Date(year, month + 1, 0);
  return new Date(year, month, d.getDate() - ((d.getDay() - weekday + 7) % 7));
}
function observed(d) {
  if (d.getDay() === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  if (d.getDay() === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
}
export function holidays(year) {
  return new Set([
    observed(new Date(year, 0, 1)), nthWeekday(year, 0, 1, 3), nthWeekday(year, 1, 1, 3), lastWeekday(year, 4, 1),
    observed(new Date(year, 5, 19)), observed(new Date(year, 6, 4)), nthWeekday(year, 8, 1, 1), nthWeekday(year, 9, 1, 2),
    observed(new Date(year, 10, 11)), nthWeekday(year, 10, 4, 4), observed(new Date(year, 11, 25)),
  ].map(ymd));
}
export function nextBusinessDay(d) {
  const x = new Date(d);
  while (x.getDay() === 0 || x.getDay() === 6 || holidays(x.getFullYear()).has(ymd(x))) x.setDate(x.getDate() + 1);
  return x;
}

// DR-15: due the 1st of the month after the period, late after the 20th
// (moved to the next business day when the 20th is a weekend or holiday).
export function dr15Dates(periodEnd) {
  const e = parseDay(periodEnd);
  return { dueOn: new Date(e.getFullYear(), e.getMonth() + 1, 1), lateAfter: nextBusinessDay(new Date(e.getFullYear(), e.getMonth() + 1, 20)) };
}

export function periodFor(date, freq = "monthly") {
  const d = date instanceof Date ? date : parseDay(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const span = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[freq] || 1;
  const startM = Math.floor(m / span) * span;
  const start = new Date(y, startM, 1);
  const end = new Date(y, startM + span, 0);
  return { start: ymd(start), end: ymd(end) };
}
export function previousPeriod(p, freq = "monthly") {
  const s = parseDay(p.start);
  return periodFor(new Date(s.getFullYear(), s.getMonth(), 0), freq);
}
export const periodLabel = (p, freq = "monthly") => {
  const s = parseDay(p.start);
  if (freq === "monthly") return s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const e = parseDay(p.end);
  return `${s.toLocaleDateString("en-US", { month: "short" })}–${e.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
};

export const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

// ---------------------------------------------------------------- rates
// rows from public.tax_rates → value effective on a date
export function rateOn(rates, code, on, jurisdiction = "") {
  const day = typeof on === "string" ? on : ymd(on || new Date());
  return rates
    .filter((r) => r.code === code && (r.jurisdiction || "") === jurisdiction && r.effective_from <= day && (!r.effective_to || r.effective_to >= day))
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0]?.value;
}
export function bracketsOn(rates, status, on) {
  const day = typeof on === "string" ? on : ymd(on);
  const code = `fed_bracket_${status}`;
  const rows = rates.filter((r) => r.code === code && r.effective_from <= day);
  const latest = rows.reduce((m, r) => (r.effective_from > m ? r.effective_from : m), "");
  return rows.filter((r) => r.effective_from === latest).map((r) => ({ floor: Number(r.jurisdiction), rate: Number(r.value) })).sort((a, b) => a.floor - b.floor);
}

// ---------------------------------------------------------------- income tax estimate
export function taxFromBrackets(taxable, brackets) {
  let tax = 0;
  brackets.forEach((b, i) => {
    const top = brackets[i + 1]?.floor ?? Infinity;
    if (taxable > b.floor) tax += (Math.min(taxable, top) - b.floor) * b.rate;
  });
  return r2(tax);
}

// Federal estimate for the owner. Florida has no personal income tax.
export function estimateIncomeTax({ netProfit, mileageDeduction = 0, entityType = "single_member", filingStatus = "single", ownerSalary = 0, rates, year }) {
  const on = `${year}-12-31`;
  const rate = (c, d) => Number(rateOn(rates, c, on) ?? d);
  const brackets = bracketsOn(rates, filingStatus === "mfj" ? "mfj" : "single", on);
  const std = rate(filingStatus === "mfj" ? "std_deduction_mfj" : "std_deduction_single", filingStatus === "mfj" ? 32200 : 16100);
  const wageBase = rate("ss_wage_base", 184500);
  const qbiRate = rate("qbi_rate", 0.2);
  const factor = rate("se_earnings_factor", 0.9235);

  const profit = Math.max(netProfit - mileageDeduction, 0);
  let se = 0;
  let halfSe = 0;
  let qbiBase = profit;
  let ordinary = profit;
  if (entityType === "s_corp") {
    // Salary already ran through payroll (and payroll taxes are in expenses).
    ordinary = profit + ownerSalary;
    qbiBase = profit;
  } else {
    const earnings = profit * factor;
    se = r2(Math.min(earnings, wageBase) * 0.124 + earnings * 0.029);
    halfSe = r2(se / 2);
    qbiBase = profit - halfSe;
  }
  const beforeQbi = Math.max(ordinary - halfSe - std, 0);
  const qbi = r2(Math.min(Math.max(qbiBase, 0) * qbiRate, beforeQbi * qbiRate));
  const taxable = Math.max(beforeQbi - qbi, 0);
  const incomeTax = taxFromBrackets(taxable, brackets);
  return { profit: r2(profit), se, halfSe, std, qbi, taxable: r2(taxable), incomeTax, total: r2(incomeTax + se) };
}

export function estimatedTaxDueDates(year) {
  return [
    { q: 1, due: new Date(year, 3, 15) },
    { q: 2, due: new Date(year, 5, 15) },
    { q: 3, due: new Date(year, 8, 15) },
    { q: 4, due: new Date(year + 1, 0, 15) },
  ].map((x) => ({ ...x, due: nextBusinessDay(x.due) }));
}

// ---------------------------------------------------------------- payroll
// FLSA workweek: Monday–Sunday. Overtime is over 40 hours per week.
export function hoursByWeek(entries) {
  const weeks = {};
  for (const t of entries) {
    if (!t.clock_out) continue;
    const start = new Date(t.clock_in);
    const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - ((start.getDay() + 6) % 7));
    const key = ymd(monday);
    const h = (new Date(t.clock_out) - start) / 3600000 - (t.break_minutes || 0) / 60;
    weeks[key] = r2((weeks[key] || 0) + Math.max(h, 0));
  }
  return weeks;
}

export function calcStub({ emp, entries = [], flatRateHours = 0, commissionBase = 0, periodsPerYear = 52, ytdGross = 0, ytdFuta = 0, rates, on }) {
  const rate = (c, d) => Number(rateOn(rates, c, on) ?? d);
  const stub = { regular_hours: 0, overtime_hours: 0, flat_rate_hours: 0, rate: Number(emp.pay_rate) || 0, regular_pay: 0, overtime_pay: 0,
    flat_rate_pay: 0, salary_pay: 0, commission_pay: 0, bonus: 0, reimbursement: 0, fed_withholding: 0, ss_employee: 0,
    medicare_employee: 0, other_deductions: 0, ss_employer: 0, medicare_employer: 0, futa: 0, suta: 0 };

  const weeks = Object.values(hoursByWeek(entries));
  const total = weeks.reduce((s, h) => s + h, 0);
  const ot = emp.overtime_eligible && emp.worker_type === "w2" ? weeks.reduce((s, h) => s + Math.max(h - 40, 0), 0) : 0;
  if (emp.pay_type === "hourly") {
    stub.regular_hours = r2(total - ot);
    stub.overtime_hours = r2(ot);
    stub.regular_pay = r2(stub.regular_hours * stub.rate);
    stub.overtime_pay = r2(stub.overtime_hours * stub.rate * 1.5);
  } else if (emp.pay_type === "salary") {
    stub.regular_hours = r2(total);
    stub.salary_pay = r2(stub.rate / periodsPerYear);
  } else if (emp.pay_type === "flat_rate") {
    stub.regular_hours = r2(total);
    stub.flat_rate_hours = r2(flatRateHours);
    stub.flat_rate_pay = r2(flatRateHours * stub.rate);
  }
  if (Number(emp.commission_pct)) stub.commission_pay = r2(commissionBase * Number(emp.commission_pct) / 100);
  return applyTaxes(stub, { emp, ytdGross, ytdFuta, rates, on });
}

export function applyTaxes(stub, { emp, ytdGross = 0, ytdFuta = 0, rates, on }) {
  const rate = (c, d) => Number(rateOn(rates, c, on) ?? d);
  const gross = r2(stub.regular_pay + stub.overtime_pay + stub.flat_rate_pay + stub.salary_pay + stub.commission_pay + n0(stub.bonus));
  if (emp.worker_type !== "w2") {
    return { ...stub, gross, fed_withholding: 0, ss_employee: 0, medicare_employee: 0, ss_employer: 0, medicare_employer: 0, futa: 0, suta: 0,
      net_pay: r2(gross + n0(stub.reimbursement)) };
  }
  const wageBase = rate("ss_wage_base", 184500);
  const ssWages = Math.max(Math.min(gross, wageBase - ytdGross), 0);
  const futaBase = rate("futa_wage_base", 7000);
  const futaWages = Math.max(Math.min(gross, futaBase - ytdFuta), 0);
  const rtBase = rate("fl_rt_wage_base", 7000);
  const rtWages = Math.max(Math.min(gross, rtBase - ytdFuta), 0);
  const s = {
    ...stub, gross,
    ss_employee: r2(ssWages * rate("fica_ss_rate", 0.062)),
    medicare_employee: r2(gross * rate("fica_medicare_rate", 0.0145)),
    ss_employer: r2(ssWages * rate("fica_ss_rate", 0.062)),
    medicare_employer: r2(gross * rate("fica_medicare_rate", 0.0145)),
    futa: r2(futaWages * rate("futa_rate", 0.006)),
    suta: r2(rtWages * rate("fl_rt_rate", 0.027)),
    fed_withholding: stub.fed_withholding_manual ?? r2(gross * (Number(emp.federal_withholding_pct) || 0) / 100),
  };
  delete s.fed_withholding_manual;
  s.net_pay = r2(s.gross + n0(s.reimbursement) - s.fed_withholding - s.ss_employee - s.medicare_employee - n0(s.other_deductions));
  return s;
}

export const PERIODS_PER_YEAR = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

// ---------------------------------------------------------------- CSV
export function toCsv(rows, columns) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.value])).join(","));
  return [head, ...body].join("\r\n");
}
