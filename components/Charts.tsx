import { useMemo } from "react";
import { Box, Grid, GridItem, HStack, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { computeExitScenario, computeStressScenarios, computeDealProfileScores } from "../utils";

type Currency = "EUR" | "USD" | "GBP" | "CHF" | "CAD";

type ChartsProps = {
  housingPrice: number;
  notaryFees: number;
  houseWorks: number;
  loanAmount: number;
  grossYield: number;
  netYield: number;
  cashOnCash: number;
  bankRate: number;
  bankLoanPeriod: number;
  monthlyMortgage: number;
  monthlyRent: number;
  monthlyCosts: number;
  annualPropertyTax: number;
  vacancyRate: number;
  downPayment: number;
  appreciationRate: number;
  rentIncreaseRate: number;
  expenseInflationRate: number;
  managementRate: number;
  capexRate: number;
  exitYear: number;
  dscr: number;
  grm: number;
  totalPrice: number;
  currency: Currency;
};

const CURRENCY_LOCALE: Record<Currency, string> = {
  EUR: "fr-FR",
  USD: "en-US",
  GBP: "en-GB",
  CHF: "de-CH",
  CAD: "en-CA",
};

const CURRENCY_SYMBOL: Record<Currency, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
  CHF: "CHF\u00a0",
  CAD: "C$",
};

const PIE_COLORS = ["#4299E1", "#ED8936", "#48BB78", "#9F7AEA"];
const EXPENSE_COLORS = ["#E53E3E", "#ED8936", "#9F7AEA", "#38B2AC", "#D69E2E", "#718096"];

// --- Computation helpers ---

export function computeAmortization(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number
) {
  const data: { year: number; balance: number; interest: number; principal: number }[] = [];
  if (loanAmount <= 0 || years <= 0 || monthlyPayment <= 0) return data;

  let balance = loanAmount;
  let cumInterest = 0;
  let cumPrincipal = 0;
  const monthlyRate = annualRate / 100 / 12;

  data.push({ year: 0, balance: Math.round(balance), interest: 0, principal: 0 });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const isLastPayment = y === years && m === 11;
      const regularPrincipal = Math.min(monthlyPayment - interest, balance);
      const principal = isLastPayment ? balance : regularPrincipal;
      balance = Math.max(0, balance - principal);
      cumInterest += interest;
      cumPrincipal += principal;
    }
    data.push({
      year: y,
      balance: Math.round(balance),
      interest: Math.round(cumInterest),
      principal: Math.round(cumPrincipal),
    });
  }
  return data;
}

export function computeAnnualPrincipalVsInterest(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number
) {
  const data: { year: number; principal: number; interest: number }[] = [];
  if (loanAmount <= 0 || years <= 0 || monthlyPayment <= 0) return data;

  let balance = loanAmount;
  const monthlyRate = annualRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const isLastPayment = y === years && m === 11;
      const regularPrincipal = Math.min(monthlyPayment - interest, balance);
      const principal = isLastPayment ? balance : regularPrincipal;
      balance = Math.max(0, balance - principal);
      yearPrincipal += principal;
      yearInterest += interest;
    }
    data.push({
      year: y,
      principal: Math.round(yearPrincipal),
      interest: Math.round(yearInterest),
    });
  }
  return data;
}

function computeEquityBuildUp(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number,
  propertyBaseValue: number,
  appreciationRate: number
) {
  const data: { year: number; paidEquity: number; appreciation: number }[] = [];
  if (years <= 0 || propertyBaseValue <= 0) return data;

  let balance = loanAmount;
  const monthlyRate = annualRate / 100 / 12;

  for (let y = 0; y <= years; y++) {
    const propertyValue = propertyBaseValue * Math.pow(1 + appreciationRate / 100, y);
    const paidEquity = propertyBaseValue - balance;
    const appreciation = propertyValue - propertyBaseValue;

    data.push({
      year: y,
      paidEquity: Math.round(Math.max(0, paidEquity)),
      appreciation: Math.round(Math.max(0, appreciation)),
    });

    // Process 12 months
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const isLastPayment = y === years - 1 && m === 11;
      const regularPrincipal = Math.min(monthlyPayment - interest, balance);
      const principal = isLastPayment ? balance : regularPrincipal;
      balance = Math.max(0, balance - principal);
    }
  }
  return data;
}

export function computeCumulativeCashflow(
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cumulative: number }[] = [];
  if (loanPeriod <= 0) return data;

  // Show 10 years beyond loan end (capped at 40) to reveal the recovery period
  const horizon = Math.min(loanPeriod + 10, 40);
  let cumulative = -downPayment;
  data.push({ year: 0, cumulative: Math.round(cumulative) });

  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const managementFees = effectiveRent * (managementRate / 100);
    const inflatedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const inflatedTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const capex = rent * (capexRate / 100);
    const netIncome = effectiveRent - managementFees - capex - inflatedCosts - inflatedTax / 12;
    // After the loan is paid off, no more mortgage payments
    const mortgage = y <= loanPeriod ? monthlyMortgage : 0;
    const cashflow = netIncome - mortgage;
    cumulative += cashflow * 12;
    data.push({ year: y, cumulative: Math.round(cumulative) });
  }
  return data;
}

function computeRentSensitivity(
  baseRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  totalPrice: number,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { label: string; cashflow: number; netYield: number }[] = [];
  if (baseRent <= 0 || totalPrice <= 0) return data;

  for (let pct = -20; pct <= 20; pct += 5) {
    const rent = baseRent * (1 + pct / 100);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const managementFees = effectiveRent * (managementRate / 100);
    const capex = rent * (capexRate / 100);
    const netIncome = effectiveRent - managementFees - capex - monthlyCosts - annualPropertyTax / 12;
    const cashflow = netIncome - monthlyMortgage;
    const netYield = ((netIncome * 12) / totalPrice) * 100;

    data.push({
      label: pct === 0 ? "0%" : `${pct > 0 ? "+" : ""}${pct}%`,
      cashflow: Math.round(cashflow),
      netYield: Number(netYield.toFixed(2)),
    });
  }
  return data;
}

export function computeAnnualCashflow(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cashflow: number }[] = [];
  if (loanPeriod <= 0) return data;
  const horizon = Math.min(loanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const managementFees = effectiveRent * (managementRate / 100);
    const inflatedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const inflatedTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const capex = rent * (capexRate / 100);
    const netIncome = effectiveRent - managementFees - capex - inflatedCosts - inflatedTax / 12;
    const mortgage = y <= loanPeriod ? monthlyMortgage : 0;
    const cashflow = (netIncome - mortgage) * 12;
    data.push({ year: y, cashflow: Math.round(cashflow) });
  }
  return data;
}

function computeIncomeVsExpenses(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; income: number; totalExpenses: number }[] = [];
  if (loanPeriod <= 0) return data;
  const horizon = Math.min(loanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const income = effectiveRent * 12;
    const mortgage = y <= loanPeriod ? monthlyMortgage * 12 : 0;
    const inflatedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const inflatedTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const managementFees = effectiveRent * (managementRate / 100);
    const capex = rent * (capexRate / 100);
    const totalExpenses = mortgage + (inflatedCosts + managementFees + capex) * 12 + inflatedTax;
    data.push({
      year: y,
      income: Math.round(income),
      totalExpenses: Math.round(totalExpenses),
    });
  }
  return data;
}

export function computeTotalReturn(
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  loanAmount: number,
  annualRate: number,
  propertyBaseValue: number,
  appreciationRate: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cumulativeCashflow: number; equity: number; totalReturn: number }[] = [];
  if (loanPeriod <= 0) return data;

  const horizon = Math.min(loanPeriod + 10, 40);
  let cumulativeCF = -downPayment;
  let balance = loanAmount;
  const monthlyRate = annualRate / 100 / 12;

  for (let y = 0; y <= horizon; y++) {
    const propertyValue = propertyBaseValue * Math.pow(1 + appreciationRate / 100, y);
    const equity = propertyValue - balance;

    if (y > 0) {
      const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
      const effectiveRent = rent * (1 - vacancyRate / 100);
      const managementFees = effectiveRent * (managementRate / 100);
      const inflatedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1);
      const inflatedTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
      const capex = rent * (capexRate / 100);
      const netIncome = effectiveRent - managementFees - capex - inflatedCosts - inflatedTax / 12;
      const mortgage = y <= loanPeriod ? monthlyMortgage : 0;
      cumulativeCF += (netIncome - mortgage) * 12;
    }

    data.push({
      year: y,
      cumulativeCashflow: Math.round(cumulativeCF),
      equity: Math.round(Math.max(0, equity)),
      totalReturn: Math.round(cumulativeCF + Math.max(0, equity)),
    });

    // Process 12 months of loan payments
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const isLastPayment = y === loanPeriod - 1 && m === 11;
      const regularPrincipal = Math.min(monthlyMortgage - interest, balance);
      const principal = isLastPayment ? balance : regularPrincipal;
      balance = Math.max(0, balance - principal);
    }
  }
  return data;
}

// --- Expense decomposition ---

export function computeExpenseDecomposition(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; fixedCosts: number; propertyTax: number; managementFees: number; capex: number; income: number }[] = [];
  if (loanPeriod <= 0) return data;
  const horizon = Math.min(loanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const fixedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1) * 12;
    const propertyTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const managementFees = effectiveRent * (managementRate / 100) * 12;
    const capex = rent * (capexRate / 100) * 12;
    const income = effectiveRent * 12;
    data.push({
      year: y,
      fixedCosts: Math.round(fixedCosts),
      propertyTax: Math.round(propertyTax),
      managementFees: Math.round(managementFees),
      capex: Math.round(capex),
      income: Math.round(income),
    });
  }
  return data;
}

// --- ROI by exit year ---

function computeROIByExitYear(
  housingPrice: number,
  houseWorks: number,
  appreciationRate: number,
  loanAmount: number,
  bankRate: number,
  bankLoanPeriod: number,
  monthlyMortgage: number,
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  managementRate: number,
  rentIncreaseRate: number,
  expenseInflationRate: number,
  capexRate: number = 0
) {
  const data: { year: number; roi: number }[] = [];
  if (downPayment === 0) return data;
  const horizon = Math.min(bankLoanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const result = computeExitScenario(
      y, housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod,
      monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax,
      vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate
    );
    if (result) {
      data.push({ year: y, roi: Number(result.annualizedRoi === 'N/A' ? '0' : result.annualizedRoi) });
    }
  }
  return data;
}

// --- Waterfall cashflow ---

function computeWaterfallData(
  monthlyRent: number,
  vacancyRate: number,
  managementRate: number,
  capexRate: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  monthlyMortgage: number
) {
  const grossRent = monthlyRent;
  const vacancyLoss = grossRent * (vacancyRate / 100);
  const effectiveRent = grossRent - vacancyLoss;
  const mgmtFees = effectiveRent * (managementRate / 100);
  const capex = grossRent * (capexRate / 100);
  const fixedCosts = monthlyCosts;
  const tax = annualPropertyTax / 12;
  const mortgage = monthlyMortgage;

  // Waterfall data: each bar shows cumulative start and end
  const items: { name: string; start: number; end: number; value: number; isTotal?: boolean }[] = [];
  let running = grossRent;
  items.push({ name: "Gross rent", start: 0, end: grossRent, value: grossRent, isTotal: true });

  if (vacancyLoss > 0) {
    items.push({ name: "Vacancy", start: running - vacancyLoss, end: running, value: -vacancyLoss });
    running -= vacancyLoss;
  }
  if (mgmtFees > 0) {
    items.push({ name: "Management", start: running - mgmtFees, end: running, value: -mgmtFees });
    running -= mgmtFees;
  }
  if (capex > 0) {
    items.push({ name: "CapEx", start: running - capex, end: running, value: -capex });
    running -= capex;
  }
  if (fixedCosts > 0) {
    items.push({ name: "Fixed costs", start: running - fixedCosts, end: running, value: -fixedCosts });
    running -= fixedCosts;
  }
  if (tax > 0) {
    items.push({ name: "Property tax", start: running - tax, end: running, value: -tax });
    running -= tax;
  }
  items.push({ name: "Net income", start: 0, end: running, value: running, isTotal: true });
  if (mortgage > 0) {
    items.push({ name: "Mortgage", start: running - mortgage, end: running, value: -mortgage });
    running -= mortgage;
  }
  items.push({ name: "Cashflow", start: Math.min(0, running), end: Math.max(0, running), value: running, isTotal: true });

  // Convert to stacked bar format: invisible base + visible bar
  return items.map((item) => ({
    name: item.name,
    base: Math.round(Math.min(item.start, item.end)),
    value: Math.round(Math.abs(item.end - item.start)),
    rawValue: Math.round(item.value),
    isPositive: item.value >= 0,
    isTotal: item.isTotal || false,
  }));
}

// --- Interest rate sensitivity ---

function computeRateSensitivity(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  managementRate: number,
  capexRate: number,
  loanAmount: number,
  bankRate: number,
  bankLoanPeriod: number
) {
  const data: { label: string; cashflow: number; dscr: number }[] = [];
  if (loanAmount <= 0 || bankLoanPeriod <= 0) return data;

  const variations = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  for (const delta of variations) {
    const rate = Math.max(0, bankRate + delta);
    const monthlyRate = rate / 100 / 12;
    const months = bankLoanPeriod * 12;
    let payment: number;
    if (monthlyRate === 0) {
      payment = loanAmount / months;
    } else {
      payment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }

    const effectiveRent = monthlyRent * (1 - vacancyRate / 100);
    const mgmtFees = effectiveRent * (managementRate / 100);
    const capex = monthlyRent * (capexRate / 100);
    const netIncome = effectiveRent - mgmtFees - capex - monthlyCosts - annualPropertyTax / 12;
    const cashflow = netIncome - payment;
    const dscr = payment === 0 ? 0 : netIncome / payment;

    data.push({
      label: `${delta === 0 ? "" : delta > 0 ? "+" : ""}${delta}%`,
      cashflow: Math.round(cashflow),
      dscr: Number(dscr.toFixed(2)),
    });
  }
  return data;
}

// --- Formatting helpers ---

function makeFormatCurrencyShort(sym: string) {
  return (value: number): string => {
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(0)}k`;
    return `${sign}${sym}${abs.toFixed(0)}`;
  };
}

function makeFormatCurrencyFull(currency: Currency) {
  const locale = CURRENCY_LOCALE[currency];
  return (value: number): string =>
    value.toLocaleString(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
}

// --- Shared sub-components ---

function ChartCard({
  title,
  info,
  children,
  bg,
  borderColor,
  titleColor,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
  bg: string;
  borderColor: string;
  titleColor: string;
}) {
  const iconColor = useColorModeValue("gray.400", "gray.500");
  return (
    <Box p={4} bg={bg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
      <HStack spacing={1} mb={2}>
        <Text fontWeight="semibold" fontSize="sm" color={titleColor}>
          {title}
        </Text>
        {info && (
          <Tooltip label={info} fontSize="xs" placement="top" hasArrow maxW="280px" shouldWrapChildren>
            <Box as="span" color={iconColor} cursor="help" fontSize="xs">&#9432;</Box>
          </Tooltip>
        )}
      </HStack>
      {children}
    </Box>
  );
}

function DonutCenterLabel({ text, color }: { text: string; color: string }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="13" fontWeight="600">
      {text}
    </text>
  );
}

// --- Main component ---

export default function Charts(props: ChartsProps) {
  const {
    housingPrice,
    notaryFees,
    houseWorks,
    loanAmount,
    grossYield,
    netYield,
    cashOnCash,
    bankRate,
    bankLoanPeriod,
    monthlyMortgage,
    monthlyRent,
    monthlyCosts,
    annualPropertyTax,
    vacancyRate,
    downPayment,
    appreciationRate,
    rentIncreaseRate,
    expenseInflationRate,
    managementRate,
    capexRate,
    exitYear,
    dscr,
    grm,
    totalPrice,
    currency,
  } = props;

  const formatCurrencyShort = useMemo(() => makeFormatCurrencyShort(CURRENCY_SYMBOL[currency]), [currency]);
  const formatCurrencyFull = useMemo(() => makeFormatCurrencyFull(currency), [currency]);

  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("#4A5568", "#A0AEC0");
  const titleColor = useColorModeValue("gray.900", "gray.100");
  const gridStroke = useColorModeValue("#E2E8F0", "#4A5568");
  const tooltipBg = useColorModeValue("#fff", "#2D3748");
  const tooltipBorder = useColorModeValue("#E2E8F0", "#4A5568");

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: "8px",
    fontSize: "12px",
  };

  const cardProps = { bg: bgCard, borderColor, titleColor };

  // --- Memoized data ---

  const investmentData = useMemo(
    () =>
      [
        { name: "Purchase price", value: housingPrice },
        { name: "Closing costs", value: notaryFees },
        ...(houseWorks > 0 ? [{ name: "Renovation", value: houseWorks }] : []),
      ].filter((d) => d.value > 0),
    [housingPrice, notaryFees, houseWorks]
  );

  const expenseData = useMemo(() => {
    const effectiveRent = monthlyRent * (1 - vacancyRate / 100);
    const vacancyLoss = monthlyRent * (vacancyRate / 100);
    const mgmtFees = effectiveRent * (managementRate / 100);
    const capexReserve = monthlyRent * (capexRate / 100);
    return [
      { name: "Mortgage", value: Math.round(monthlyMortgage) },
      { name: "Charges", value: Math.round(monthlyCosts) },
      { name: "Property tax", value: Math.round(annualPropertyTax / 12) },
      ...(mgmtFees > 0 ? [{ name: "Management fees", value: Math.round(mgmtFees) }] : []),
      ...(capexReserve > 0 ? [{ name: "CapEx reserve", value: Math.round(capexReserve) }] : []),
      ...(vacancyLoss > 0 ? [{ name: "Vacancy loss", value: Math.round(vacancyLoss) }] : []),
    ].filter((d) => d.value > 0);
  }, [monthlyMortgage, monthlyCosts, annualPropertyTax, monthlyRent, vacancyRate, managementRate, capexRate]);

  const yieldData = useMemo(
    () => [
      { name: "Gross yield", value: Number(grossYield.toFixed(2)), fill: "#4299E1" },
      { name: "Net yield", value: Number(netYield.toFixed(2)), fill: "#48BB78" },
      { name: "Cash-on-cash", value: Number(cashOnCash.toFixed(2)), fill: "#ED8936" },
    ],
    [grossYield, netYield, cashOnCash]
  );

  const amortizationData = useMemo(
    () => computeAmortization(loanAmount, bankRate, bankLoanPeriod, monthlyMortgage),
    [loanAmount, bankRate, bankLoanPeriod, monthlyMortgage]
  );

  const annualBreakdownData = useMemo(
    () => computeAnnualPrincipalVsInterest(loanAmount, bankRate, bankLoanPeriod, monthlyMortgage),
    [loanAmount, bankRate, bankLoanPeriod, monthlyMortgage]
  );

  const propertyBaseValue = housingPrice + houseWorks;

  const equityData = useMemo(
    () =>
      computeEquityBuildUp(
        loanAmount,
        bankRate,
        bankLoanPeriod,
        monthlyMortgage,
        propertyBaseValue,
        appreciationRate
      ),
    [loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, propertyBaseValue, appreciationRate]
  );

  const cumulativeCashflowData = useMemo(
    () =>
      computeCumulativeCashflow(
        downPayment,
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        rentIncreaseRate,
        bankLoanPeriod,
        expenseInflationRate,
        managementRate,
        capexRate
      ),
    [downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate]
  );

  const rentSensitivityData = useMemo(
    () =>
      computeRentSensitivity(
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        totalPrice,
        managementRate,
        capexRate
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, totalPrice, managementRate, capexRate]
  );

  const annualCashflowData = useMemo(
    () =>
      computeAnnualCashflow(
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        rentIncreaseRate,
        bankLoanPeriod,
        expenseInflationRate,
        managementRate,
        capexRate
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate]
  );

  const incomeVsExpensesData = useMemo(
    () =>
      computeIncomeVsExpenses(
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        rentIncreaseRate,
        bankLoanPeriod,
        expenseInflationRate,
        managementRate,
        capexRate
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate]
  );

  const totalReturnData = useMemo(
    () =>
      computeTotalReturn(
        downPayment,
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        rentIncreaseRate,
        bankLoanPeriod,
        loanAmount,
        bankRate,
        propertyBaseValue,
        appreciationRate,
        expenseInflationRate,
        managementRate,
        capexRate
      ),
    [downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, loanAmount, bankRate, propertyBaseValue, appreciationRate, expenseInflationRate, managementRate, capexRate]
  );

  // Expense decomposition data
  const expenseDecompositionData = useMemo(
    () => computeExpenseDecomposition(monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate]
  );

  // Breakeven year from cumulative cashflow
  const breakevenYear = useMemo(() => {
    for (let i = 1; i < cumulativeCashflowData.length; i++) {
      if (cumulativeCashflowData[i - 1].cumulative < 0 && cumulativeCashflowData[i].cumulative >= 0) {
        return cumulativeCashflowData[i].year;
      }
    }
    return null;
  }, [cumulativeCashflowData]);

  // Exit scenario
  const exitScenarioData = useMemo(
    () => computeExitScenario(exitYear, housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate),
    [exitYear, housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate]
  );

  // Profit composition (for exit scenario donut)
  const profitCompositionData = useMemo(() => {
    if (!exitScenarioData) return [];
    return [
      { name: "Cumulative cashflow", value: Math.max(0, exitScenarioData.cumulativeCashflow) },
      { name: "Capital gain", value: Math.max(0, exitScenarioData.capitalGain) },
      { name: "Equity paid", value: Math.max(0, exitScenarioData.equityPaid) },
    ].filter((d) => d.value > 0);
  }, [exitScenarioData]);

  // ROI by exit year
  const roiByExitYearData = useMemo(
    () => computeROIByExitYear(housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate),
    [housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate]
  );

  // Stress test scenarios
  const stressData = useMemo(
    () => computeStressScenarios(monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate, downPayment, propertyBaseValue, appreciationRate),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, expenseInflationRate, managementRate, capexRate, downPayment, propertyBaseValue, appreciationRate]
  );

  // Stress test chart data (merged)
  const stressChartData = useMemo(() => {
    if (stressData.length < 3) return [];
    const [opt, base, pess] = stressData;
    return base.annualData.map((d, i) => ({
      year: d.year,
      optimistic: opt.annualData[i]?.cashflow ?? 0,
      base: d.cashflow,
      pessimistic: pess.annualData[i]?.cashflow ?? 0,
    }));
  }, [stressData]);

  // Deal profile radar scores
  const dealProfileData = useMemo(
    () => computeDealProfileScores(dscr, cashOnCash, netYield, grm),
    [dscr, cashOnCash, netYield, grm]
  );

  // Waterfall data
  const waterfallData = useMemo(
    () => computeWaterfallData(monthlyRent, vacancyRate, managementRate, capexRate, monthlyCosts, annualPropertyTax, monthlyMortgage),
    [monthlyRent, vacancyRate, managementRate, capexRate, monthlyCosts, annualPropertyTax, monthlyMortgage]
  );

  // Rate sensitivity data
  const rateSensitivityData = useMemo(
    () => computeRateSensitivity(monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate, loanAmount, bankRate, bankLoanPeriod),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate, loanAmount, bankRate, bankLoanPeriod]
  );

  const xAxisInterval = bankLoanPeriod > 20 ? 4 : bankLoanPeriod > 10 ? 1 : 0;
  const horizon = Math.min(bankLoanPeriod + 10, 40);
  const xAxisIntervalLong = horizon > 25 ? 4 : horizon > 15 ? 2 : 0;

  const PROFIT_COLORS = ["#4299E1", "#48BB78", "#ED8936"];

  return (
    <Box mt={6}>
      {/* ====== OVERVIEW ====== */}
      <Text fontSize="lg" fontWeight="bold" mb={3} color={titleColor}>
        Overview
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>

        {/* Investment Breakdown */}
        {investmentData.length > 0 && (
          <GridItem>
            <ChartCard title="Investment Breakdown" info="How your total investment is split between purchase price, closing costs, and renovation." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={investmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {investmentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: textColor }} />
                  <DonutCenterLabel text={formatCurrencyFull(investmentData.reduce((s, d) => s + d.value, 0))} color={textColor} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Monthly Expense Breakdown */}
        {expenseData.length > 0 && (
          <GridItem>
            <ChartCard title="Monthly Expense Breakdown" info="Where your money goes each month: mortgage, charges, property tax, and vacancy loss." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${formatCurrencyFull(Number(value))}/mo`} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: textColor }} />
                  <DonutCenterLabel text={`${formatCurrencyFull(expenseData.reduce((s, d) => s + d.value, 0))}/mo`} color={textColor} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Cashflow Waterfall */}
        {waterfallData.length > 0 && (
          <GridItem>
            <ChartCard title="Monthly Cashflow Waterfall" info="Step-by-step breakdown from gross rent to final cashflow. Green bars are totals/income, red bars are deductions. Shows exactly where each euro goes." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={waterfallData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip
                    formatter={(_value: unknown, _name: unknown, props: unknown) => formatCurrencyFull(((props as { payload: { rawValue: number } }).payload).rawValue)}
                    contentStyle={tooltipStyle}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="base" stackId="waterfall" fill="transparent" />
                  <Bar dataKey="value" stackId="waterfall" fill="#48BB78">
                    {waterfallData.map((entry, index) => (
                      <Cell key={index} fill={entry.isTotal ? (entry.isPositive ? "#48BB78" : "#FC8181") : "#FC8181"} fillOpacity={entry.isTotal ? 0.9 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* ROI & Yield Metrics */}
        <GridItem>
          <ChartCard title="ROI & Yield Metrics (%)" info="Gross yield (before expenses), net yield (after expenses), and cash-on-cash return (annual cashflow / down payment). Negative values mean a loss." {...cardProps}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={yieldData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: textColor, fontSize: 12 }} width={95} />
                <RechartsTooltip formatter={(value) => `${Number(value).toFixed(2)}%`} contentStyle={tooltipStyle} />
                <ReferenceLine x={0} stroke={textColor} strokeDasharray="3 3" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {yieldData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridItem>

        {/* Rent Sensitivity */}
        {rentSensitivityData.length > 0 && (
          <GridItem>
            <ChartCard title="Rent Sensitivity Analysis" info="How monthly cashflow and net yield change if rent varies from -20% to +20%. The vertical dashed line marks your current rent. Useful for assessing risk." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={rentSensitivityData} margin={{ left: 5, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11 }} />
                  <YAxis yAxisId="cashflow" tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <YAxis yAxisId="yield" orientation="right" tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    formatter={(value, name) =>
                      name === "Monthly cashflow"
                        ? formatCurrencyFull(Number(value))
                        : `${Number(value).toFixed(2)}%`
                    }
                    contentStyle={tooltipStyle}
                  />
                  <ReferenceLine yAxisId="cashflow" y={0} stroke={textColor} strokeDasharray="3 3" />
                  <ReferenceLine x="0%" stroke={textColor} strokeDasharray="3 3" strokeWidth={1} />
                  <Line yAxisId="cashflow" type="monotone" dataKey="cashflow" name="Monthly cashflow" stroke="#48BB78" strokeWidth={2} dot={{ r: 3, fill: "#48BB78" }} />
                  <Line yAxisId="yield" type="monotone" dataKey="netYield" name="Net yield" stroke="#4299E1" strokeWidth={2} dot={{ r: 3, fill: "#4299E1" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Interest Rate Sensitivity */}
        {rateSensitivityData.length > 0 && (
          <GridItem>
            <ChartCard title="Interest Rate Sensitivity" info="How your monthly cashflow and DSCR change if the interest rate moves. Shows the impact of rate changes from -2% to +2% vs your current rate. Critical for variable-rate loans." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={rateSensitivityData} margin={{ left: 5, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11 }} />
                  <YAxis yAxisId="cashflow" tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <YAxis yAxisId="dscr" orientation="right" tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => String(name) === "DSCR" ? Number(value).toFixed(2) : formatCurrencyFull(Number(value))} />
                  <ReferenceLine yAxisId="cashflow" y={0} stroke={textColor} strokeDasharray="3 3" />
                  <Bar yAxisId="cashflow" dataKey="cashflow" name="Cashflow" fill="#48BB78">
                    {rateSensitivityData.map((entry, index) => (
                      <Cell key={index} fill={entry.cashflow >= 0 ? "#48BB78" : "#FC8181"} />
                    ))}
                  </Bar>
                  <Line yAxisId="dscr" type="monotone" dataKey="dscr" name="DSCR" stroke="#4299E1" strokeWidth={2} dot={{ r: 3, fill: "#4299E1" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Deal Profile Radar */}
        {dealProfileData.length > 0 && (
          <GridItem>
            <ChartCard title="Deal Profile" info="Radar chart showing the deal's strengths and weaknesses across 4 key metrics. Each axis ranges from 0 (poor) to 100 (excellent). DSCR, Cash-on-Cash, Net Yield, and GRM (inverted — lower GRM = higher score)." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={dealProfileData}>
                  <PolarGrid stroke={gridStroke} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: textColor, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: textColor, fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#4299E1" fill="#4299E1" fillOpacity={0.3} strokeWidth={2} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

      </Grid>

      {/* ====== MORTGAGE ====== */}
      <Text fontSize="lg" fontWeight="bold" mb={3} mt={8} color={titleColor}>
        Mortgage
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>

        {/* Annual Principal vs Interest */}
        {annualBreakdownData.length > 0 && (
          <GridItem>
            <ChartCard title="Annual Principal vs Interest" info="For each year, how much of your mortgage payments goes to principal (green) vs interest (red). Over time, the principal share grows as the interest share shrinks." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={annualBreakdownData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 11 }} interval={xAxisInterval} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="#48BB78" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill="#FC8181" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Amortization Schedule */}
        {amortizationData.length > 0 && (
          <GridItem>
            <ChartCard title="Amortization Schedule" info="Remaining loan balance (blue, decreasing), cumulative interest paid (red, increasing), and cumulative principal repaid (green, increasing) over the loan term." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={amortizationData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="balance" name="Remaining balance" stroke="#4299E1" fill="#4299E1" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="interest" name="Cumulative interest" stroke="#FC8181" fill="#FC8181" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="principal" name="Cumulative principal" stroke="#48BB78" fill="#48BB78" fillOpacity={0.15} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

      </Grid>

      {/* ====== INVESTMENT ====== */}
      <Text fontSize="lg" fontWeight="bold" mb={3} mt={8} color={titleColor}>
        Investment
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>

        {/* Annual Cashflow */}
        {annualCashflowData.length > 0 && (
          <GridItem>
            <ChartCard title="Annual Cashflow" info="Year-by-year cashflow (rental income minus all expenses and mortgage). Green bars are profitable years, red bars are losses. After the loan ends, mortgage drops to zero." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={annualCashflowData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 11 }} interval={xAxisIntervalLong} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
                  <Bar dataKey="cashflow" name="Annual cashflow" radius={[4, 4, 0, 0]}>
                    {annualCashflowData.map((entry, i) => (
                      <Cell key={i} fill={entry.cashflow >= 0 ? "#48BB78" : "#FC8181"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Income vs Expenses */}
        {incomeVsExpensesData.length > 0 && (
          <GridItem>
            <ChartCard title="Income vs Expenses" info="Compares annual rental income (green) against total expenses (red: mortgage + fixed costs + management fees + CapEx + property tax). Expenses grow with inflation. After the loan ends, expenses drop sharply." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={incomeVsExpensesData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 11 }} interval={xAxisIntervalLong} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine x={bankLoanPeriod} stroke="#ED8936" strokeDasharray="3 3" label={{ value: "Loan end", fill: "#ED8936", fontSize: 10, position: "top" }} />
                  <Area type="monotone" dataKey="income" name="Rental income" stroke="#48BB78" fill="#48BB78" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="totalExpenses" name="Total expenses" stroke="#FC8181" fill="#FC8181" fillOpacity={0.2} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Expense Decomposition by Year */}
        {expenseDecompositionData.length > 0 && (
          <GridItem>
            <ChartCard title="Expense Decomposition by Year" info="Stacked breakdown of all expenses year by year. Shows how fixed costs and property tax grow with inflation, while management fees and CapEx scale with rent. The green line represents rental income for comparison." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={expenseDecompositionData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} interval={xAxisIntervalLong} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Bar dataKey="fixedCosts" name="Fixed costs" stackId="expenses" fill="#E53E3E" fillOpacity={0.8} />
                  <Bar dataKey="propertyTax" name="Property tax" stackId="expenses" fill="#ED8936" fillOpacity={0.8} />
                  <Bar dataKey="managementFees" name="Management fees" stackId="expenses" fill="#9F7AEA" fillOpacity={0.8} />
                  <Bar dataKey="capex" name="CapEx" stackId="expenses" fill="#D69E2E" fillOpacity={0.8} />
                  <Line type="monotone" dataKey="income" name="Rental income" stroke="#48BB78" strokeWidth={2} dot={false} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Equity Build-Up */}
        {equityData.length > 0 && (
          <GridItem>
            <ChartCard title={appreciationRate === 0 ? "Equity Build-Up" : `Equity Build-Up (+${appreciationRate}%/yr)`} info="Total equity = property value minus remaining loan. Blue = equity from principal paid (includes down payment + loan repayment). Green = equity from property appreciation. Appreciation applies to property value only, not rent." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={equityData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="paidEquity" name="Equity (principal paid)" stackId="1" stroke="#4299E1" fill="#4299E1" fillOpacity={0.3} strokeWidth={2} />
                  <Area type="monotone" dataKey="appreciation" name="Equity (appreciation)" stackId="1" stroke="#48BB78" fill="#48BB78" fillOpacity={0.3} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Cumulative Cashflow Projection */}
        {cumulativeCashflowData.length > 0 && (
          <GridItem>
            <ChartCard title="Cumulative Cashflow Projection" info="Starts at negative down payment, then adds annual cashflow each year. Includes rent increases, expense inflation, management fees, and CapEx. After the loan ends (vertical line), mortgage drops to zero. Purple marker = breakeven year." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={cumulativeCashflowData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" label={{ value: "Break-even", fill: textColor, fontSize: 11 }} />
                  <ReferenceLine x={bankLoanPeriod} stroke="#ED8936" strokeDasharray="3 3" label={{ value: "Loan end", fill: "#ED8936", fontSize: 10, position: "top" }} />
                  {breakevenYear !== null && (
                    <ReferenceLine x={breakevenYear} stroke="#9F7AEA" strokeDasharray="5 3" strokeWidth={2} label={{ value: `Breakeven Y${breakevenYear}`, fill: "#9F7AEA", fontSize: 10, position: "insideBottomRight" }} />
                  )}
                  <Line type="monotone" dataKey="cumulative" name="Cumulative cashflow" stroke="#48BB78" strokeWidth={2} dot={{ r: 3, fill: "#48BB78" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

        {/* Total Return on Investment */}
        {totalReturnData.length > 0 && (
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <ChartCard title="Total Return on Investment" info="Combines cumulative cashflow (blue) and equity buildup (green) to show your total return (purple). Equity = property value minus remaining loan. Total return = equity + cumulative cashflow. This is the complete picture of your investment performance." {...cardProps}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={totalReturnData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
                  <ReferenceLine x={bankLoanPeriod} stroke="#ED8936" strokeDasharray="3 3" label={{ value: "Loan end", fill: "#ED8936", fontSize: 10, position: "top" }} />
                  <Line type="monotone" dataKey="cumulativeCashflow" name="Cumulative cashflow" stroke="#4299E1" strokeWidth={2} dot={{ r: 2, fill: "#4299E1" }} />
                  <Line type="monotone" dataKey="equity" name="Equity" stroke="#48BB78" strokeWidth={2} dot={{ r: 2, fill: "#48BB78" }} />
                  <Line type="monotone" dataKey="totalReturn" name="Total return" stroke="#9F7AEA" strokeWidth={3} dot={{ r: 3, fill: "#9F7AEA" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>
        )}

      </Grid>

      {/* ====== EXIT & SCENARIOS ====== */}
      {(profitCompositionData.length > 0 || roiByExitYearData.length > 0) && (
        <>
          <Text fontSize="lg" fontWeight="bold" mb={3} mt={8} color={titleColor}>
            Exit Scenario (Year {exitYear})
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            {/* Profit Composition */}
            {profitCompositionData.length > 0 && exitScenarioData && (
              <GridItem>
                <ChartCard title="Profit Composition at Exit" info={`Breakdown of total profit if you sell at year ${exitYear}. Shows where your returns come from: cumulative rental cashflow, capital gain from appreciation, and equity from loan repayment.`} {...cardProps}>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={profitCompositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {profitCompositionData.map((_, i) => (
                          <Cell key={i} fill={PROFIT_COLORS[i % PROFIT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </GridItem>
            )}

            {/* ROI by Exit Year */}
            {roiByExitYearData.length > 0 && (
              <GridItem>
                <ChartCard title="Annualized ROI by Exit Year" info="Annualized return on investment (%) if you sell at each year. Equivalent to the annual compound growth rate of your down payment. Helps compare with other investments and identify the optimal holding period." {...cardProps}>
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={roiByExitYearData} margin={{ left: 5, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} interval={xAxisIntervalLong} />
                      <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip formatter={(value) => `${Number(value).toFixed(1)}%`} contentStyle={tooltipStyle} />
                      <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
                      <ReferenceLine x={exitYear} stroke="#9F7AEA" strokeDasharray="5 3" strokeWidth={2} label={{ value: `Exit Y${exitYear}`, fill: "#9F7AEA", fontSize: 10, position: "top" }} />
                      <Line type="monotone" dataKey="roi" name="Annualized ROI" stroke="#4299E1" strokeWidth={2} dot={{ r: 2, fill: "#4299E1" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </GridItem>
            )}
          </Grid>
        </>
      )}

      {/* ====== STRESS TEST ====== */}
      {stressChartData.length > 0 && (
        <>
          <Text fontSize="lg" fontWeight="bold" mb={3} mt={8} color={titleColor}>
            Stress Test
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <ChartCard title="Cashflow Projection — 3 Scenarios" info="Green = optimistic (vacancy halved, rent increase +1%). Blue = base case (your inputs). Red = pessimistic (vacancy doubled, no rent increase, expense inflation +1%). The shaded area shows the uncertainty range." {...cardProps}>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={stressChartData} margin={{ left: 5, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} interval={xAxisIntervalLong} />
                    <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                    <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                    <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="optimistic" stroke="none" fill="#48BB78" fillOpacity={0.08} legendType="none" tooltipType="none" />
                    <Area type="monotone" dataKey="pessimistic" stroke="none" fill="#FC8181" fillOpacity={0.08} legendType="none" tooltipType="none" />
                    <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke="#48BB78" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="base" name="Base" stroke="#4299E1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#FC8181" strokeWidth={2} dot={false} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
            </GridItem>
          </Grid>
        </>
      )}
    </Box>
  );
}
