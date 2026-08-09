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
import {
  computeAmortization,
  computeAnnualCashflow,
  computeAnnualPrincipalVsInterest,
  computeBreakevenYear,
  computeCumulativeCashflow,
  computeEquityBuildUp,
  computeExpenseDecomposition,
  computeIncomeVsExpenses,
  computeRateSensitivity,
  computeRentSensitivity,
  computeROIByExitYear,
  computeTotalReturn,
  computeWaterfallData,
} from "../utils/projections";

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

// --- Formatting helpers ---

function makeFormatCurrencyShort(sym: string) {
  return (value: number): string => {
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    // Test against the rounded thousands, otherwise 999_999 renders as "1000k".
    if (abs >= 1_000_000 || Math.round(abs / 1_000) >= 1_000)
      return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
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

  // Breakeven year, read from the unrounded series so the marker cannot land a
  // year before the figure shown in the summary panel.
  const breakevenYear = useMemo(
    () =>
      computeBreakevenYear(
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
            <ChartCard title={appreciationRate === 0 ? "Equity Build-Up" : `Equity Build-Up (${appreciationRate > 0 ? "+" : ""}${appreciationRate}%/yr)`} info="Total equity = property value minus remaining loan. Blue = equity from loan repayment (property value at purchase minus what you still owe; closing costs are not part of the property's value). Green = equity from appreciation, which goes negative if prices fall. Appreciation applies to property value only, not rent." {...cardProps}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={equityData} margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="year" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(Number(v))} />
                  <RechartsTooltip formatter={(value) => formatCurrencyFull(Number(value))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke={textColor} strokeWidth={1} />
                  <Area type="monotone" dataKey="paidEquity" name="Equity (loan repayment)" stackId="1" stroke="#4299E1" fill="#4299E1" fillOpacity={0.3} strokeWidth={2} />
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
                <ChartCard title="Annualized ROI by Exit Year" info="Annualized return on investment (%) if you sell at each year. Equivalent to the annual compound growth rate of your down payment — not an IRR, so it ignores when the cash arrives. A gap in the line means the loss would exceed the whole down payment, leaving no annualized rate to plot. Before tax and selling costs." {...cardProps}>
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
