import { useMemo } from "react";
import { Box, Grid, GridItem, Text, useColorModeValue } from "@chakra-ui/react";
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
  Legend,
} from "recharts";

type ChartsProps = {
  housingPrice: number;
  notaryFees: number;
  houseWorks: number;
  loanAmount: number;
  totalInterest: number;
  grossYield: number;
  netYield: number;
  cashOnCash: number;
  bankRate: number;
  bankLoanPeriod: number;
  monthlyMortgage: number;
};

const PIE_COLORS = ["#4299E1", "#ED8936", "#48BB78", "#9F7AEA"];

function computeAmortization(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number
) {
  const data: {
    year: number;
    balance: number;
    interest: number;
    principal: number;
  }[] = [];
  let balance = loanAmount;
  const monthlyRate = annualRate / 100 / 12;
  let cumInterest = 0;
  let cumPrincipal = 0;

  data.push({ year: 0, balance: Math.round(balance), interest: 0, principal: 0 });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const principal = Math.min(monthlyPayment - interest, balance);
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

const formatCurrencyShort = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number): string =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function ChartCard({
  title,
  children,
  bg,
  borderColor,
  titleColor,
}: {
  title: string;
  children: React.ReactNode;
  bg: string;
  borderColor: string;
  titleColor: string;
}) {
  return (
    <Box p={4} bg={bg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
      <Text fontWeight="semibold" fontSize="sm" mb={2} color={titleColor}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

export default function Charts(props: ChartsProps) {
  const {
    housingPrice,
    notaryFees,
    houseWorks,
    loanAmount,
    totalInterest,
    grossYield,
    netYield,
    cashOnCash,
    bankRate,
    bankLoanPeriod,
    monthlyMortgage,
  } = props;

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

  // Investment breakdown
  const investmentData = useMemo(
    () =>
      [
        { name: "Purchase price", value: housingPrice },
        { name: "Closing costs", value: notaryFees },
        ...(houseWorks > 0 ? [{ name: "Renovation", value: houseWorks }] : []),
      ].filter((d) => d.value > 0),
    [housingPrice, notaryFees, houseWorks]
  );

  // Mortgage breakdown
  const mortgageData = useMemo(
    () =>
      [
        { name: "Principal", value: loanAmount },
        { name: "Interest", value: totalInterest },
      ].filter((d) => d.value > 0),
    [loanAmount, totalInterest]
  );

  // Yield comparison
  const yieldData = useMemo(
    () => [
      { name: "Gross yield", value: Number(grossYield.toFixed(2)), fill: "#4299E1" },
      { name: "Net yield", value: Number(netYield.toFixed(2)), fill: "#48BB78" },
      { name: "Cash-on-cash", value: Number(cashOnCash.toFixed(2)), fill: "#ED8936" },
    ],
    [grossYield, netYield, cashOnCash]
  );

  // Amortization schedule
  const amortizationData = useMemo(
    () => computeAmortization(loanAmount, bankRate, bankLoanPeriod, monthlyMortgage),
    [loanAmount, bankRate, bankLoanPeriod, monthlyMortgage]
  );

  return (
    <Box mt={6}>
      <Text fontSize="xl" fontWeight="bold" mb={4} color={titleColor}>
        Analytics
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        {/* Investment Breakdown */}
        <GridItem>
          <ChartCard
            title="Investment Breakdown"
            bg={bgCard}
            borderColor={borderColor}
            titleColor={titleColor}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={investmentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {investmentData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: textColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridItem>

        {/* Mortgage Cost Split */}
        <GridItem>
          <ChartCard
            title="Mortgage Cost Split"
            bg={bgCard}
            borderColor={borderColor}
            titleColor={titleColor}
          >
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={mortgageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  <Cell fill="#4299E1" />
                  <Cell fill="#FC8181" />
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: textColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridItem>

        {/* ROI & Yield Metrics */}
        <GridItem>
          <ChartCard
            title="ROI & Yield Metrics (%)"
            bg={bgCard}
            borderColor={borderColor}
            titleColor={titleColor}
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={yieldData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  type="number"
                  tick={{ fill: textColor, fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: textColor, fontSize: 12 }}
                  width={95}
                />
                <RechartsTooltip
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {yieldData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridItem>

        {/* Amortization Schedule */}
        <GridItem>
          <ChartCard
            title="Amortization Schedule"
            bg={bgCard}
            borderColor={borderColor}
            titleColor={titleColor}
          >
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={amortizationData} margin={{ left: 5, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: textColor, fontSize: 12 }}
                  label={{
                    value: "Year",
                    position: "insideBottom",
                    offset: -5,
                    fill: textColor,
                    fontSize: 12,
                  }}
                />
                <YAxis
                  tick={{ fill: textColor, fontSize: 12 }}
                  tickFormatter={(v) => formatCurrencyShort(Number(v))}
                />
                <RechartsTooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  contentStyle={tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Remaining balance"
                  stroke="#4299E1"
                  fill="#4299E1"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="interest"
                  name="Cumulative interest"
                  stroke="#FC8181"
                  fill="#FC8181"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="principal"
                  name="Cumulative principal"
                  stroke="#48BB78"
                  fill="#48BB78"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: textColor }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridItem>
      </Grid>
    </Box>
  );
}
