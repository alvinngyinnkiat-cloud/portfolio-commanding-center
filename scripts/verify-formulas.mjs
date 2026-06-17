/**
 * v1.1 formula verification.
 * Run: node scripts/verify-formulas.mjs
 */

function usdToSgd(usd, fx) {
  return usd * fx;
}

function sgdToUsd(sgd, fx) {
  return fx > 0 ? sgd / fx : 0;
}

function calculateTotalCashSgd(usdTrading, sgdTrading, crypto, fx) {
  return usdTrading * fx + sgdTrading + crypto;
}

function calculateStockAllocation(amountSgd, usdPct, fx) {
  const usdAmountSgd = amountSgd * (usdPct / 100);
  const sgdAmountSgd = amountSgd - usdAmountSgd;
  return { usdAmountSgd, sgdAmountSgd, usdAmountUsd: sgdToUsd(usdAmountSgd, fx) };
}

function getContributionCashImpact(transaction, fxRate) {
  if (transaction.category === "crypto") {
    return { usdTradingCashUsd: 0, sgdTradingCashSgd: 0, cryptoCashSgd: transaction.amountSgd };
  }
  const alloc = calculateStockAllocation(
    transaction.amountSgd,
    transaction.usdAllocationPercent ?? 100,
    fxRate
  );
  return {
    usdTradingCashUsd: alloc.usdAmountUsd,
    sgdTradingCashSgd: alloc.sgdAmountSgd,
    cryptoCashSgd: 0,
  };
}

function calculateCashBalancesFromContributions(contributions, fxRate) {
  let usdTradingCashUsd = 0;
  let sgdTradingCashSgd = 0;
  let cryptoCashSgd = 0;
  for (const transaction of contributions) {
    const impact = getContributionCashImpact(transaction, fxRate);
    const sign = transaction.type === "deposit" ? 1 : -1;
    usdTradingCashUsd += sign * impact.usdTradingCashUsd;
    sgdTradingCashSgd += sign * impact.sgdTradingCashSgd;
    cryptoCashSgd += sign * impact.cryptoCashSgd;
  }
  return { usdTradingCashUsd, sgdTradingCashSgd, cryptoCashSgd };
}

let failed = 0;

// Example from spec: 1000 SGD, 75% USD, FX 1.35
const alloc = calculateStockAllocation(1000, 75, 1.35);
const ok1 = Math.abs(alloc.usdAmountSgd - 750) < 0.01;
const ok2 = Math.abs(alloc.sgdAmountSgd - 250) < 0.01;
const ok3 = Math.abs(alloc.usdAmountUsd - 555.555555) < 0.01;
console.log(`${ok1 ? "PASS" : "FAIL"} USD allocation SGD = 750`);
console.log(`${ok2 ? "PASS" : "FAIL"} SGD allocation = 250`);
console.log(`${ok3 ? "PASS" : "FAIL"} USD amount = 555.56 USD`);
if (!ok1 || !ok2 || !ok3) failed++;

// Total cash formula
const fx = 1.35;
const usdTrading = 10000;
const sgdTrading = 2500;
const crypto = 2000;
const totalCash = calculateTotalCashSgd(usdTrading, sgdTrading, crypto, fx);
const expectedCash = 10000 * 1.35 + 2500 + 2000;
const ok4 = Math.abs(totalCash - expectedCash) < 0.01;
console.log(`${ok4 ? "PASS" : "FAIL"} Total cash SGD = ${expectedCash}`);
if (!ok4) failed++;

// Total contribution SGD-based
const contributions = [
  { type: "deposit", category: "stock", amountSgd: 10000, usdAllocationPercent: 75 },
  { type: "deposit", category: "crypto", amountSgd: 5000 },
  { type: "deposit", category: "stock", amountSgd: 8000, usdAllocationPercent: 100 },
];
const totalContrib = contributions.reduce((s, c) => s + c.amountSgd, 0);
const ok5 = totalContrib === 23000;
console.log(`${ok5 ? "PASS" : "FAIL"} Total contribution = 23000 (SGD keyed)`);
if (!ok5) failed++;

// Cash from contributions (default seed data)
const cash = calculateCashBalancesFromContributions(contributions, fx);
const alloc1 = calculateStockAllocation(10000, 75, fx);
const alloc3 = calculateStockAllocation(8000, 100, fx);
const expectedUsdCash = alloc1.usdAmountUsd + alloc3.usdAmountUsd;
const expectedSgdCash = alloc1.sgdAmountSgd;
const expectedCryptoCash = 5000;
const ok6a = Math.abs(cash.usdTradingCashUsd - expectedUsdCash) < 0.01;
const ok6b = Math.abs(cash.sgdTradingCashSgd - expectedSgdCash) < 0.01;
const ok6c = Math.abs(cash.cryptoCashSgd - expectedCryptoCash) < 0.01;
console.log(`${ok6a ? "PASS" : "FAIL"} US Available Cash from contributions`);
console.log(`${ok6b ? "PASS" : "FAIL"} SG Available Cash from contributions`);
console.log(`${ok6c ? "PASS" : "FAIL"} Crypto Cash from contributions`);
if (!ok6a || !ok6b || !ok6c) failed++;

// Client portfolio SGD = USD × FX
const clientUsd = 15000;
const clientSgd = usdToSgd(clientUsd, fx);
const ok7 = Math.abs(clientSgd - 20250) < 0.01;
console.log(`${ok7 ? "PASS" : "FAIL"} Client Portfolio SGD = USD × FX (${clientSgd})`);
if (!ok7) failed++;

// Full transaction history regression (user-reported bug)
const userTxs = [
  { type: "deposit", category: "crypto", amountSgd: 5000 },
  { type: "deposit", category: "crypto", amountSgd: 1000 },
  { type: "deposit", category: "stock", amountSgd: 10000, usdAllocationPercent: 100 },
  { type: "deposit", category: "stock", amountSgd: 8000, usdAllocationPercent: 100 },
  { type: "deposit", category: "stock", amountSgd: 1000, usdAllocationPercent: 75 },
  { type: "withdrawal", category: "stock", amountSgd: 1000, usdAllocationPercent: 75 },
];
const userCash = calculateCashBalancesFromContributions(userTxs, fx);
const ok9 = Math.abs(userCash.usdTradingCashUsd - 13333.34) < 0.01;
const ok10 = Math.abs(userCash.sgdTradingCashSgd - 0) < 0.01;
const ok11 = Math.abs(userCash.cryptoCashSgd - 6000) < 0.01;
console.log(`${ok9 ? "PASS" : "FAIL"} User history US Available Cash = 13333.34`);
console.log(`${ok10 ? "PASS" : "FAIL"} User history SG Available Cash = 0`);
console.log(`${ok11 ? "PASS" : "FAIL"} User history Crypto Cash = 6000`);
if (!ok9 || !ok10 || !ok11) failed++;

function splitPersonalAndClientCash(totalCashSgd, clientPortfolioSgd) {
  const personalCashSgd = Math.max(
    0,
    totalCashSgd - Math.min(clientPortfolioSgd, totalCashSgd)
  );
  const clientCashSgd = totalCashSgd - personalCashSgd;
  return { personalCashSgd, clientCashSgd };
}

function calculateClientOwnershipPercent(clientPortfolioSgd, totalPortfolioSgd) {
  return totalPortfolioSgd > 0
    ? (clientPortfolioSgd / totalPortfolioSgd) * 100
    : 0;
}

// MODULE 1 FREEZE acceptance test (user spec example)
const acceptUsStocks = 40000;
const acceptSgStocks = 10000;
const acceptCrypto = 20000;
const acceptTotalCash = 30000;
const acceptClientPortfolio = 20000;
const { personalCashSgd, clientCashSgd } = splitPersonalAndClientCash(
  acceptTotalCash,
  acceptClientPortfolio
);
const myPortfolio = acceptUsStocks + acceptSgStocks + acceptCrypto + personalCashSgd;
const totalPortfolio = myPortfolio + acceptClientPortfolio;
const clientOwnership = calculateClientOwnershipPercent(
  acceptClientPortfolio,
  totalPortfolio
);
const assetBreakdownTotal =
  acceptUsStocks + acceptSgStocks + acceptCrypto + personalCashSgd;
const portfolioOwnershipTotal = myPortfolio + acceptClientPortfolio;

const ok12 = personalCashSgd === 10000;
const ok13 = clientCashSgd === 20000;
const ok14 = myPortfolio === 80000;
const ok15 = totalPortfolio === 100000;
const ok16 = assetBreakdownTotal === 80000;
const ok17 = portfolioOwnershipTotal === 100000;
const ok18 = Math.abs(clientOwnership - 20) < 0.01;

console.log(`${ok12 ? "PASS" : "FAIL"} Personal Cash = 10,000`);
console.log(`${ok13 ? "PASS" : "FAIL"} Client Cash = 20,000`);
console.log(`${ok14 ? "PASS" : "FAIL"} My Portfolio = 80,000`);
console.log(`${ok15 ? "PASS" : "FAIL"} Total Portfolio = 100,000`);
console.log(`${ok16 ? "PASS" : "FAIL"} Asset Breakdown total = My Portfolio`);
console.log(`${ok17 ? "PASS" : "FAIL"} Portfolio Ownership total reconciles`);
console.log(`${ok18 ? "PASS" : "FAIL"} Client Ownership % = 20%`);
if (
  !ok12 ||
  !ok13 ||
  !ok14 ||
  !ok15 ||
  !ok16 ||
  !ok17 ||
  !ok18
) {
  failed++;
}

const negativeCashSplit = splitPersonalAndClientCash(-2_000, 50_000);
const ok23 = negativeCashSplit.personalCashSgd === 0;
const ok24 = negativeCashSplit.clientCashSgd === -2_000;
console.log(`${ok23 ? "PASS" : "FAIL"} Personal Cash never negative (overdrawn total cash)`);
console.log(`${ok24 ? "PASS" : "FAIL"} Client Cash absorbs negative total cash remainder`);
if (!ok23 || !ok24) failed++;

function isValidFxRate(fx) {
  return typeof fx === "number" && !Number.isNaN(fx) && fx > 0;
}

const ok19 = !isValidFxRate(null);
const ok20 = !isValidFxRate(0);
const ok21 = !isValidFxRate(-1);
const ok22 = isValidFxRate(1.35);
console.log(`${ok19 ? "PASS" : "FAIL"} Blank/null FX is invalid`);
console.log(`${ok20 ? "PASS" : "FAIL"} FX = 0 is invalid`);
console.log(`${ok21 ? "PASS" : "FAIL"} FX = -1 is invalid`);
console.log(`${ok22 ? "PASS" : "FAIL"} FX = 1.35 is valid`);
if (!ok19 || !ok20 || !ok21 || !ok22) failed++;

process.exit(failed > 0 ? 1 : 0);
