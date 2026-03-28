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
} from "recharts";

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
const EXPENSE_COLORS = ["#E53E3E", "#ED8936", "#9F7AEA", "#718096"];

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

function computeCumulativeCashflow(
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number
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
    const netIncome = effectiveRent - monthlyCosts - annualPropertyTax / 12;
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
  totalPrice: number
) {
  const data: { label: string; cashflow: number; netYield: number }[] = [];
  if (baseRent <= 0 || totalPrice <= 0) return data;

  for (let pct = -20; pct <= 20; pct += 5) {
    const rent = baseRent * (1 + pct / 100);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const netIncome = effectiveRent - monthlyCosts - annualPropertyTax / 12;
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

function computeAnnualCashflow(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number
) {
  const data: { year: number; cashflow: number }[] = [];
  if (loanPeriod <= 0) return data;
  const horizon = Math.min(loanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const netIncome = effectiveRent - monthlyCosts - annualPropertyTax / 12;
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
  loanPeriod: number
) {
  const data: { year: number; income: number; totalExpenses: number }[] = [];
  if (loanPeriod <= 0) return data;
  const horizon = Math.min(loanPeriod + 10, 40);
  for (let y = 1; y <= horizon; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const income = rent * (1 - vacancyRate / 100) * 12;
    const mortgage = y <= loanPeriod ? monthlyMortgage * 12 : 0;
    const totalExpenses = mortgage + monthlyCosts * 12 + annualPropertyTax;
    data.push({
      year: y,
      income: Math.round(income),
      totalExpenses: Math.round(totalExpenses),
    });
  }
  return data;
}

function computeTotalReturn(
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
  appreciationRate: number
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
      const netIncome = effectiveRent - monthlyCosts - annualPropertyTax / 12;
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
    const vacancyLoss = monthlyRent * (vacancyRate / 100);
    return [
      { name: "Mortgage", value: Math.round(monthlyMortgage) },
      { name: "Charges", value: Math.round(monthlyCosts) },
      { name: "Property tax", value: Math.round(annualPropertyTax / 12) },
      ...(vacancyLoss > 0 ? [{ name: "Vacancy loss", value: Math.round(vacancyLoss) }] : []),
    ].filter((d) => d.value > 0);
  }, [monthlyMortgage, monthlyCosts, annualPropertyTax, monthlyRent, vacancyRate]);

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
        bankLoanPeriod
      ),
    [downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod]
  );

  const rentSensitivityData = useMemo(
    () =>
      computeRentSensitivity(
        monthlyRent,
        monthlyCosts,
        annualPropertyTax,
        vacancyRate,
        monthlyMortgage,
        totalPrice
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, totalPrice]
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
        bankLoanPeriod
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod]
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
        bankLoanPeriod
      ),
    [monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod]
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
        appreciationRate
      ),
    [downPayment, monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, monthlyMortgage, rentIncreaseRate, bankLoanPeriod, loanAmount, bankRate, propertyBaseValue, appreciationRate]
  );

  const xAxisInterval = bankLoanPeriod > 20 ? 4 : bankLoanPeriod > 10 ? 1 : 0;
  const horizon = Math.min(bankLoanPeriod + 10, 40);
  const xAxisIntervalLong = horizon > 25 ? 4 : horizon > 15 ? 2 : 0;

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
            <ChartCard title="Income vs Expenses" info="Compares annual rental income (green) against total expenses (red: mortgage + operating costs + property tax). The gap between the two areas is your annual cashflow. After the loan ends, expenses drop sharply." {...cardProps}>
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

        {/* Equity Build-Up */}
        {equityData.length > 0 && (
          <GridItem>
            <ChartCard title={appreciationRate === 0 ? "Equity Build-Up" : `Equity Build-Up (+${appreciationRate}%/yr)`} info="Total equity = property value minus remaining loan. Blue = equity from mortgage payments. Green = equity from property appreciation. Appreciation applies to property value only, not rent." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={equityData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="paidEquity" name="Equity (payments)" stackId="1" stroke="#4299E1" fill="#4299E1" fillOpacity={0.3} strokeWidth={2} />
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
            <ChartCard title="Cumulative Cashflow Projection" info="Starts at negative down payment, then adds annual cashflow each year. After the loan ends (vertical line), mortgage drops to zero and cashflow improves. The horizontal dashed line marks break-even." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={cumulativeCashflowData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke={textColor} strokeDasharray="3 3" label={{ value: "Break-even", fill: textColor, fontSize: 11 }} />
                  <ReferenceLine x={bankLoanPeriod} stroke="#ED8936" strokeDasharray="3 3" label={{ value: "Loan end", fill: "#ED8936", fontSize: 10, position: "top" }} />
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
    </Box>
  );
}
