import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";
import { buildExportSheets } from "../utils/export";
import { parseStateFromQuery, serializeStateToQuery } from "../utils/state";

const Charts = dynamic(() => import("../components/Charts"), { ssr: false });
import {
  Box,
  Button,
  Code,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { InfoOutlineIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";

import {
  getEffectiveManagementRatePercent,
  type ManagementRateUnit,
} from "../utils";
import {
  DSCR_COVERS_DEBT,
  rateIndicator,
  type RatedMetric,
} from "../utils/benchmarks";
import { analyzeDeal } from "../utils/deal";

type Key =
  | "housingPrice"
  | "notaryFees"
  | "houseWorks"
  | "bankLoan"
  | "bankRate"
  | "bankLoanPeriod"
  | "rent"
  | "propertyTax"
  | "monthlyCosts"
  | "managementRate"
  | "vacancyRate"
  | "appreciationRate"
  | "rentIncreaseRate"
  | "expenseInflationRate"
  | "capexRate"
  | "exitYear";

type Field = {
  key: Key;
  name: string;
  step: number;
  placeholder: string;
  min?: number;
  max?: number;
  tooltip?: string;
};

type Section = {
  title: string;
  fields: Field[];
};

const sections: Section[] = [
  {
    title: "Property 🏠",
    fields: [
      { key: "housingPrice", name: "Purchase price", step: 10000, placeholder: "e.g. 150,000", min: 0, tooltip: "The total acquisition price of the property, excluding closing costs and renovation." },
      { key: "notaryFees", name: "Closing costs (notary, agency...)", step: 1000, placeholder: "e.g. 12,000", min: 0, tooltip: "All fees paid at purchase: notary fees, agency commission, registration taxes, etc. Typically 7-10% for existing properties in France." },
      { key: "houseWorks", name: "Renovation budget", step: 1000, placeholder: "0", min: 0, tooltip: "Total cost of planned renovations. Added to the property base value for appreciation calculations and to total investment." },
      { key: "appreciationRate", name: "Annual property appreciation (%)", step: 0.5, placeholder: "e.g. 2", min: -10, max: 20, tooltip: "Expected annual increase in property value. Historical average ~2-3% in stable markets. Set to 0 for conservative estimates. Impacts equity build-up and exit scenario." },
      { key: "exitYear", name: "Exit year (sale)", step: 1, placeholder: "e.g. 10", min: 1, max: 50, tooltip: "The year you plan to sell the property. Used to calculate sale price, capital gain, total profit, and ROI at exit." },
    ],
  },
  {
    title: "Mortgage 💳",
    fields: [
      { key: "bankLoan", name: "Loan amount", step: 10000, placeholder: "e.g. 150,000", min: 0, tooltip: "The amount borrowed from the bank. Down payment = Total investment − Loan amount. If loan > purchase price, you're financing renovation too." },
      { key: "bankRate", name: "Interest rate (%)", step: 0.1, placeholder: "e.g. 3.5", min: 0, max: 20, tooltip: "Annual interest rate on the mortgage. Use the Rate Sensitivity chart to see how changes affect your cashflow and DSCR." },
      { key: "bankLoanPeriod", name: "Loan term (years)", step: 1, placeholder: "e.g. 20", min: 1, max: 50, tooltip: "Duration of the mortgage. Longer term = lower monthly payment but more total interest. Typical: 15-25 years." },
    ],
  },
  {
    title: "Rental 💰",
    fields: [
      { key: "rent", name: "Monthly rent", step: 100, placeholder: "e.g. 750", min: 0, tooltip: "Gross monthly rent before any deductions. This is the amount the tenant pays. Use comparable rents in the area." },
      { key: "propertyTax", name: "Annual property tax", step: 100, placeholder: "e.g. 1,000", min: 0, tooltip: "Annual property tax (taxe foncière). Increases with expense inflation rate in long-term projections." },
      { key: "monthlyCosts", name: "Monthly fixed costs (charges, insurance, maintenance...)", step: 50, placeholder: "e.g. 150", min: 0, tooltip: "Fixed monthly charges: building fees (copropriété), landlord insurance (PNO), routine maintenance budget. These increase yearly with the expense inflation rate." },
      { key: "managementRate", name: "Management fees (% of rent)", step: 1, placeholder: "e.g. 8", min: 0, max: 100, tooltip: "Property management company fees. Switch the unit selector to enter either as % of effective rent (typical: 6-10%) or as months of rent per year (typical: 1 month/year ≈ 8.33%). Set to 0 if you self-manage." },
      { key: "capexRate", name: "CapEx reserve (% of gross rent)", step: 1, placeholder: "e.g. 5", min: 0, max: 50, tooltip: "Capital Expenditure reserve for major repairs and replacements (roof, boiler, plumbing, appliances). Set aside monthly as % of gross rent. Industry standard: 5-10%. Not a real expense today but a provision for future large costs." },
      { key: "vacancyRate", name: "Vacancy rate (%)", step: 1, placeholder: "e.g. 5", min: 0, max: 100, tooltip: "Percentage of time the property is vacant (no tenant). 5% ≈ 18 days/year. Reduces effective income. Typical: 3-8% depending on market." },
      { key: "rentIncreaseRate", name: "Annual rent increase (%)", step: 0.5, placeholder: "e.g. 1.5", min: -10, max: 20, tooltip: "Expected annual rent increase. Tied to inflation index (IRL in France). Applied in all long-term projections. Typical: 1-3%." },
      { key: "expenseInflationRate", name: "Annual expense inflation (%)", step: 0.5, placeholder: "e.g. 2", min: -5, max: 20, tooltip: "Annual increase in fixed costs and property tax. Reflects general inflation. Used in all projection charts. If your expenses grow faster than rent, cashflow erodes over time." },
    ],
  },
];

type State = {
  [key in Key]: string | number;
};

type Currency = "EUR" | "USD" | "GBP" | "CHF" | "CAD";

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "CHF", label: "CHF", symbol: "CHF" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
];

const CURRENCY_LOCALE: Record<Currency, string> = {
  EUR: "fr-FR",
  USD: "en-US",
  GBP: "en-GB",
  CHF: "de-CH",
  CAD: "en-CA",
};

const makeFormatCurrency = (currency: Currency) => (value: string): string =>
  Number(value).toLocaleString(CURRENCY_LOCALE[currency], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: "currency",
    currency,
  });

const formatPercent = (value: string): string =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " %";

const defaultState: State = {
  housingPrice: 150000,
  notaryFees: 12000,
  houseWorks: 0,
  bankLoan: 120000,
  bankRate: 3.5,
  bankLoanPeriod: 25,
  rent: 900,
  propertyTax: 1000,
  monthlyCosts: 120,
  managementRate: 0,
  vacancyRate: 5,
  appreciationRate: 1.5,
  rentIncreaseRate: 1.5,
  expenseInflationRate: 2,
  capexRate: 3,
  exitYear: 25,
};

const MGMT_UNIT_VALUES = ["percent", "monthsPerYear"] as const;
const isManagementRateUnit = (v: unknown): v is ManagementRateUnit =>
  typeof v === "string" && (MGMT_UNIT_VALUES as readonly string[]).includes(v);

const Home: NextPage = () => {
  const router = useRouter();
  const [state, setState] = useState<State>(defaultState);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [managementRateUnit, setManagementRateUnit] = useState<ManagementRateUnit>("percent");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const formatCurrency = useMemo(() => makeFormatCurrency(currency), [currency]);
  const { colorMode, setColorMode } = useColorMode();
  const basePath = router.basePath || "";

  const bgCard = useColorModeValue("white", "gray.800");
  const bgCashflowPositive = useColorModeValue("green.50", "green.900");
  const bgCashflowNegative = useColorModeValue("red.50", "red.900");
  const borderCashflowPositive = useColorModeValue("green.200", "green.700");
  const borderCashflowNegative = useColorModeValue("red.200", "red.700");
  const textCashflowPositive = useColorModeValue("green.600", "green.400");
  const textCashflowNegative = useColorModeValue("red.600", "red.400");
  const bgRendementBon = useColorModeValue("green.50", "green.900");
  const bgRendementFaible = useColorModeValue("gray.50", "gray.800");
  const borderRendementBon = useColorModeValue("green.200", "green.700");
  const borderRendementFaible = useColorModeValue("gray.200", "gray.700");
  const textRendementBon = useColorModeValue("green.600", "green.400");
  const textRendementFaible = useColorModeValue("gray.700", "gray.300");
  const bgRecap = useColorModeValue("gray.50", "gray.800");
  const textLabel = useColorModeValue("gray.600", "gray.400");
  const textTitle = useColorModeValue("gray.900", "gray.100");
  const borderInput = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("inherit", "gray.100");
  const inputPlaceholder = useColorModeValue("gray.500", "gray.400");
  const textRevenu = useColorModeValue("green.700", "green.400");
  const textInterest = useColorModeValue("red.600", "red.400");

  // Excellent reads green, good reads muted, weak reads red. Metrics with no
  // rating (cash-on-cash when no equity is at risk) keep the default colour.
  const ratingColor = (metric: RatedMetric, raw: string): string | undefined => {
    switch (rateIndicator(metric, raw)) {
      case "excellent": return textRendementBon;
      case "good": return textRendementFaible;
      case "weak": return textCashflowNegative;
      default: return undefined;
    }
  };

  // Sync state from URL when query params are present
  useEffect(() => {
    if (Object.keys(router.query).length > 0) {
      setState(parseStateFromQuery(router.query, defaultState));
      const urlCurrency = router.query.currency as string | undefined;
      if (urlCurrency && CURRENCIES.some((c) => c.code === urlCurrency)) {
        setCurrency(urlCurrency as Currency);
      }
      const urlUnit = router.query.managementRateUnit;
      if (isManagementRateUnit(urlUnit)) {
        setManagementRateUnit(urlUnit);
      }
    }
  }, [router.query]);

  // On first load with no params, push defaults to URL so it's shareable
  useEffect(() => {
    if (!router.isReady) return;
    if (Object.keys(router.query).length === 0) {
      void router.replace(
        { query: { ...serializeStateToQuery(defaultState), currency: "EUR", managementRateUnit: "percent" } },
        undefined,
        { shallow: true }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const onChangeState = (key: string, value: string) => {
    const newState = { ...state, [key]: value };
    setState(newState);
    const query = { ...router.query, [key]: value };
    void router.replace({ query }, undefined, { shallow: true });
  };

  const onChangeCurrency = (code: Currency) => {
    setCurrency(code);
    const query = { ...router.query, currency: code };
    void router.replace({ query }, undefined, { shallow: true });
  };

  const onChangeManagementRateUnit = (next: ManagementRateUnit) => {
    if (next === managementRateUnit) return;
    // Convert the displayed value so the underlying economic rate stays identical:
    //   8% ⇄ 0.96 months/year, 10% ⇄ 1.2 months/year, etc.
    const current = Number(state.managementRate);
    let converted: number = current;
    if (isFinite(current) && current > 0) {
      converted = next === "monthsPerYear" ? (current * 12) / 100 : (current * 100) / 12;
      // Round to 2 decimals for readability
      converted = Math.round(converted * 100) / 100;
    }
    const newState = { ...state, managementRate: converted };
    setState(newState);
    setManagementRateUnit(next);
    const query = {
      ...router.query,
      managementRate: String(converted),
      managementRateUnit: next,
    };
    void router.replace({ query }, undefined, { shallow: true });
  };

  // Convert the user-entered management rate to its monthly-percent equivalent.
  // If unit is "%", this is just the raw value. If unit is "months/year", we
  // convert: 1 month/year = 8.33%/mo. Everything downstream uses this number.
  const effectiveMgmtRatePercent = useMemo(
    () => getEffectiveManagementRatePercent(state.managementRate, managementRateUnit),
    [state.managementRate, managementRateUnit]
  );

  // Every indicator comes from one derivation so the page, the Excel export and
  // the MCP server cannot drift apart.
  const metrics = useMemo(
    () =>
      analyzeDeal({
        housingPrice: Number(state.housingPrice),
        notaryFees: Number(state.notaryFees),
        houseWorks: Number(state.houseWorks),
        appreciationRate: Number(state.appreciationRate),
        exitYear: Number(state.exitYear),
        bankLoan: Number(state.bankLoan),
        bankRate: Number(state.bankRate),
        bankLoanPeriod: Number(state.bankLoanPeriod),
        rent: Number(state.rent),
        propertyTax: Number(state.propertyTax),
        monthlyCosts: Number(state.monthlyCosts),
        managementRate: effectiveMgmtRatePercent,
        capexRate: Number(state.capexRate),
        vacancyRate: Number(state.vacancyRate),
        rentIncreaseRate: Number(state.rentIncreaseRate),
        expenseInflationRate: Number(state.expenseInflationRate),
      }),
    [state, effectiveMgmtRatePercent]
  );

  const {
    totalPrice,
    downPayment,
    monthlyMortgageExact,
    monthlyMortgagePayment,
    totalMortgageInterest,
    totalMortgageCost,
    totalOperationCost,
    netMonthlyIncome,
    cashflowExact,
    cashflow,
    grossYield,
    netYield,
    cashOnCash,
    breakEvenRent,
    ltv,
    dscr,
    grm,
    capRate,
    onePercentRule,
    oer,
    projections,
    exitScenario,
    stressScenarios,
  } = metrics;

  const onReset = () => {
    setState(defaultState);
    setCurrency("EUR");
    setManagementRateUnit("percent");
    void router.replace(
      { query: { ...serializeStateToQuery(defaultState), currency: "EUR", managementRateUnit: "percent" } },
      undefined,
      { shallow: true }
    );
  };

  const onExport = () => {
    const strip = (value: string): number => Number(value.replace(/[^0-9.-]+/g, ""));

    const sheets = buildExportSheets(
      {
        housingPrice: Number(state.housingPrice),
        notaryFees: Number(state.notaryFees),
        houseWorks: Number(state.houseWorks),
        bankLoan: Number(state.bankLoan),
        bankRate: Number(state.bankRate),
        bankLoanPeriod: Number(state.bankLoanPeriod),
        rent: Number(state.rent),
        propertyTax: Number(state.propertyTax),
        monthlyCosts: Number(state.monthlyCosts),
        managementRate: effectiveMgmtRatePercent,
        vacancyRate: Number(state.vacancyRate),
        appreciationRate: Number(state.appreciationRate),
        rentIncreaseRate: Number(state.rentIncreaseRate),
        expenseInflationRate: Number(state.expenseInflationRate),
        capexRate: Number(state.capexRate),
        exitYear: Number(state.exitYear),
      },
      {
        totalPrice: strip(totalPrice),
        downPayment: strip(downPayment),
        ltv,
        monthlyMortgagePayment: strip(monthlyMortgagePayment),
        totalMortgageCost: strip(totalMortgageCost),
        totalMortgageInterest: strip(totalMortgageInterest),
        totalOperationCost: strip(totalOperationCost),
        netMonthlyIncome: strip(netMonthlyIncome),
        cashflow: strip(cashflow),
        breakEvenRent: strip(breakEvenRent),
        grossYield,
        netYield,
        cashOnCash,
        dscr,
        grm,
        capRate,
        onePercentRule,
        oer,
      },
      projections,
      exitScenario,
      stressScenarios
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.purchase), "Purchase");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.mortgage), "Mortgage");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.rental), "Rental");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.results), "Results");
    XLSX.writeFile(workbook, `rental-roi-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <Box
      maxWidth="1400px"
      marginX="auto"
      paddingX={{ base: "16px", md: "24px" }}
      paddingY={{ base: "16px", md: "32px" }}
    >
      <Head>
        <title>Real Estate ROI Calculator</title>
        <meta
          name="description"
          content="Calculate rental property ROI, cashflow, and yield. Free Excel export. Make smarter real estate investment decisions."
        />
        <meta name="keywords" content="Real Estate ROI Calculator, rental yield, cashflow calculator, mortgage calculator, investment property ROI, landlord tools" />
        <link rel="canonical" href="https://maxgfr.github.io/real-estate-calculator/" />

        {/* Favicon and Icons */}
        <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon.svg`} />
        <link rel="apple-touch-icon" href={`${basePath}/icon.svg`} />
        <link rel="manifest" href={`${basePath}/manifest.json`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Real Estate ROI Calculator" />
        <meta property="og:description" content="Calculate rental property ROI, cashflow, and yield. Free Excel export. Make smarter real estate investment decisions." />
        <meta property="og:url" content="https://maxgfr.github.io/real-estate-calculator/" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Estate ROI Calculator" />
        <meta name="twitter:description" content="Calculate rental property ROI, cashflow, and yield. Free Excel export." />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Real Estate ROI Calculator",
              "description": "Calculate rental property ROI, cashflow, and yield. Free Excel export for real estate investors.",
              "url": "https://maxgfr.github.io/real-estate-calculator/",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Monthly mortgage payment calculation",
                "Cashflow analysis",
                "Gross and net yield calculation",
                "Excel export functionality",
                "Dark/Light theme support"
              ],
              "author": {
                "@type": "Organization",
                "name": "real-estate-calculator"
              }
            }),
          }}
        />

        {/* JSON-LD SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Real Estate ROI Calculator",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
            }),
          }}
        />
      </Head>

      <HStack justify="space-between" align="center" mb={6}>
        <Text
          fontSize={{ base: "xl", md: "2xl", lg: "3xl" }}
          fontWeight="bold"
        >
          Real Estate ROI Calculator
        </Text>
        <HStack spacing={1}>
          <Menu>
            <MenuButton as={Button} variant="ghost" size="sm" fontWeight="normal">
              {CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency}
            </MenuButton>
            <MenuList>
              {CURRENCIES.map((c) => (
                <MenuItem key={c.code} onClick={() => onChangeCurrency(c.code)} fontWeight={c.code === currency ? "bold" : "normal"}>
                  {c.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <IconButton
            aria-label="Show formulas"
            icon={<InfoOutlineIcon />}
            variant="ghost"
            size="md"
            onClick={onOpen}
          />
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Theme options"
              icon={colorMode === "light" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              size="md"
            />
            <MenuList>
              <MenuItem onClick={() => setColorMode("light")}>
                <SunIcon boxSize={4} mr={3} /> Light
              </MenuItem>
              <MenuItem onClick={() => setColorMode("dark")}>
                <MoonIcon boxSize={4} mr={3} /> Dark
              </MenuItem>
              <MenuItem onClick={() => setColorMode("system")}>
                🖥️ System
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>

      <FormulasModal isOpen={isOpen} onClose={onClose} />

      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "350px 1fr" }}
        gap={6}
      >
        {/* Left column: Results */}
        <GridItem order={{ base: 2, md: 1 }}>
          <VStack spacing={4} align="stretch">
            <HStack spacing={3}>
              <Button onClick={onReset} variant="outline" size="sm" flex={1}>
                🔄 Reset
              </Button>
              <Button onClick={onExport} colorScheme="blue" size="sm" flex={1}>
                📥 Export
              </Button>
            </HStack>

            {/* At-a-glance summary */}
            <Grid templateColumns="1fr 1fr" gap={3}>
              <Tooltip label="Net monthly income − mortgage. Positive = the property pays for itself." fontSize="xs" placement="top" hasArrow>
                <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center" cursor="help">
                  <Text fontSize="xs" color={textLabel} fontWeight="bold">CASHFLOW</Text>
                  <Text fontSize="lg" fontWeight="bold" color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}>
                    {formatCurrency(cashflow)}<Text as="span" fontSize="xs" color={textLabel}>/mo</Text>
                  </Text>
                </Box>
              </Tooltip>
              <Tooltip label="Annual cashflow / down payment. Measures the return on the cash you invested. Target: > 8%." fontSize="xs" placement="top" hasArrow>
                <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center" cursor="help">
                  <Text fontSize="xs" color={textLabel} fontWeight="bold">CASH-ON-CASH</Text>
                  <Text fontSize="lg" fontWeight="bold" color={cashOnCash === 'N/A' ? textLabel : Number(cashOnCash) >= 0 ? textCashflowPositive : textCashflowNegative}>
                    {cashOnCash === 'N/A' ? 'N/A' : `${Number(cashOnCash).toFixed(1)}%`}
                  </Text>
                </Box>
              </Tooltip>
              <Tooltip label="Debt Service Coverage Ratio = net income / mortgage. ≥ 1.25 = lender minimum. < 1.0 = income doesn't cover the mortgage." fontSize="xs" placement="top" hasArrow>
                <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center" cursor="help">
                  <Text fontSize="xs" color={textLabel} fontWeight="bold">DSCR</Text>
                  <Text fontSize="lg" fontWeight="bold" color={dscr === '∞' ? textRendementBon : Number(dscr) >= 1.25 ? textRendementBon : Number(dscr) >= 1 ? textLabel : textCashflowNegative}>
                    {dscr}
                  </Text>
                </Box>
              </Tooltip>
              <Tooltip label="Year when cumulative cashflow turns positive — you've recovered your down payment from rental income." fontSize="xs" placement="top" hasArrow>
                <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center" cursor="help">
                  <Text fontSize="xs" color={textLabel} fontWeight="bold">BREAKEVEN</Text>
                  <Text fontSize="lg" fontWeight="bold" color={projections?.breakevenYear !== null ? textCashflowPositive : textCashflowNegative}>
                    {projections?.breakevenYear !== null ? `Y${projections?.breakevenYear}` : "N/A"}
                  </Text>
                </Box>
              </Tooltip>
            </Grid>

            {/* Cashflow - Highlighted */}
            <Box
              p={6}
              bg={Number(cashflow) >= 0 ? bgCashflowPositive : bgCashflowNegative}
              borderRadius="xl"
              borderWidth="2px"
              borderColor={
                Number(cashflow) >= 0 ? borderCashflowPositive : borderCashflowNegative
              }
            >
              <Stat>
                <StatLabel fontSize="sm" color={textLabel}>
                  <HStack spacing={1} display="inline-flex">
                    <span>Monthly cashflow</span>
                    <Tooltip shouldWrapChildren label="Net monthly income − monthly mortgage payment. Positive means the property pays for itself." fontSize="xs" placement="top" hasArrow maxW="240px">
                      <InfoOutlineIcon boxSize="10px" cursor="help" opacity={0.6} />
                    </Tooltip>
                  </HStack>
                </StatLabel>
                <StatNumber
                  fontSize={{ base: "3xl", md: "4xl" }}
                  color={
                    Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative
                  }
                  fontWeight="bold"
                >
                  {formatCurrency(cashflow)}
                </StatNumber>
                <StatHelpText as="div">
                  <Box>{Number(cashflow) >= 0 ? "✨ Positive" : "⚠️ Negative"}</Box>
                  <Box fontSize="xs" mt={0.5}>Annual: {formatCurrency(String(Math.round(cashflowExact * 12)))}</Box>
                </StatHelpText>
              </Stat>
            </Box>

            {/* Net yield - Highlighted */}
            <Box
              p={5}
              bg={Number(netYield) >= 3 ? bgRendementBon : bgRendementFaible}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={
                Number(netYield) >= 3 ? borderRendementBon : borderRendementFaible
              }
            >
              <Stat>
                <StatLabel fontSize="sm" color={textLabel}>
                  <HStack spacing={1} display="inline-flex">
                    <span>Net yield</span>
                    <Tooltip shouldWrapChildren label="(Net annual income / Total investment) × 100. Accounts for vacancy, costs and taxes. Target: >5% excellent, 3-5% good." fontSize="xs" placement="top" hasArrow maxW="240px">
                      <InfoOutlineIcon boxSize="10px" cursor="help" opacity={0.6} />
                    </Tooltip>
                  </HStack>
                </StatLabel>
                <StatNumber
                  fontSize="2xl"
                  color={
                    rateIndicator("netYield", netYield) === "weak"
                      ? textRendementFaible
                      : textRendementBon
                  }
                  fontWeight="bold"
                >
                  {formatPercent(netYield)}
                </StatNumber>
                <StatHelpText>
                  {{
                    excellent: "🎯 Excellent",
                    good: "👍 Good",
                    weak: "⚠️ Low",
                  }[rateIndicator("netYield", netYield) ?? "weak"]}
                </StatHelpText>
              </Stat>
            </Box>

            {/* Financial summary */}
            <Box p={4} bg={bgRecap} borderRadius="xl" borderWidth="1px" borderColor={borderInput}>
              <Text fontWeight="bold" mb={3} fontSize="lg" color={textTitle}>
                Summary 📊
              </Text>
              <VStack spacing={2} align="stretch">
                <SectionLabel label="Investment" />
                <FlexRow label="Total investment" value={formatCurrency(totalPrice)} tooltip="Purchase price + closing costs + renovation budget" />
                <FlexRow label="Down payment" value={formatCurrency(downPayment)} tooltip="Total investment − loan amount. The cash you put in upfront." />
                <FlexRow label="Loan-to-Value (LTV)" value={formatPercent(ltv)} tooltip="(Loan amount / Purchase price) × 100. Banks typically require LTV ≤ 80%. Higher LTV = more leveraged. Values >100% mean the loan exceeds the purchase price (e.g. financing renovation)." color={Number(ltv) > 90 ? textCashflowNegative : Number(ltv) > 80 ? textInterest : undefined} />

                <SectionLabel label="Credit" />
                <FlexRow label="Monthly payment" value={formatCurrency(monthlyMortgagePayment)} tooltip="Fixed monthly mortgage payment: P × [t(1+t)^n] / [(1+t)^n − 1]" />
                <FlexRow label="Interest paid" value={formatCurrency(totalMortgageInterest)} color={textInterest} tooltip="Total interest paid to the bank over the full loan term." />
                <FlexRow label="Total repaid" value={formatCurrency(totalMortgageCost)} tooltip="Loan amount + total interest paid. What you actually pay back to the bank." />
                <FlexRow label="Total operation cost" value={formatCurrency(totalOperationCost)} tooltip="Total investment + total interest paid. The true all-in cost of the operation." />

                <SectionLabel label="Rental" />
                <FlexRow label="Net monthly income" value={formatCurrency(netMonthlyIncome)} color={textRevenu} tooltip="Effective rent − management fees − CapEx − monthly fixed costs − property tax / 12. Effective rent = gross rent × (1 − vacancy rate). Management fees = % of effective rent. CapEx = % of gross rent." />
                <FlexRow
                  label="Monthly cashflow"
                  value={formatCurrency(cashflow)}
                  color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="Net monthly income − monthly mortgage payment. Positive means the property pays for itself."
                />
                <FlexRow
                  label="Annual cashflow"
                  value={formatCurrency(String(Math.round(cashflowExact * 12)))}
                  color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="Monthly cashflow × 12. Total gain or loss per year after all costs and mortgage."
                />
                <FlexRow label="Break-even rent" value={formatCurrency(breakEvenRent)} tooltip="Minimum monthly rent to reach zero cashflow: (costs + tax/12 + mortgage) / ((1 − vacancy%) × (1 − mgmt%) − capex%). Accounts for vacancy, management fees, and CapEx reserve." />

                <SectionLabel label="Performance" />
                <FlexRow label="Gross yield" value={formatPercent(grossYield)} tooltip="(Annual rent / Total investment) × 100. Uses total investment (purchase + closing + renovation), more conservative than market listings using purchase price only. Does not account for expenses — use net yield for a realistic view." />
                <FlexRow label="Net yield" value={formatPercent(netYield)} color={Number(netYield) >= 3 ? textRendementBon : textRendementFaible} tooltip="(Net annual income / Total investment) × 100. Accounts for vacancy, management fees, CapEx, fixed costs, and property tax. Target: >5% excellent, 3-5% good." />
                <FlexRow
                  label="Cash-on-cash return"
                  value={cashOnCash === 'N/A' ? 'N/A' : formatPercent(cashOnCash)}
                  color={cashOnCash === 'N/A' ? undefined : Number(cashOnCash) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="(Annual cashflow / Down payment) × 100. The actual return on the cash you invested. N/A when no equity is at risk (100% financed, or a loan larger than the total cost). Target: >8% excellent, 4-8% good."
                />
                <FlexRow
                  label="DSCR"
                  value={dscr}
                  // Not ratingColor: DSCR has a fourth band. Between 1.0 and the
                  // 1.25 lender minimum the debt is covered, so it reads neutral
                  // rather than red even though the rating is weak.
                  color={
                    rateIndicator("dscr", dscr) !== "weak"
                      ? textRendementBon
                      : Number(dscr) >= DSCR_COVERS_DEBT
                        ? undefined
                        : textCashflowNegative
                  }
                  tooltip="Debt Service Coverage Ratio = NOI / Mortgage payment. Measured on NOI, the way a lender does: the CapEx reserve is capital, not an operating expense. ≥ 1.5 excellent, ≥ 1.25 good (standard lender minimum), ≥ 1.0 covers debt (tight), < 1.0 deficit. ∞ if no mortgage (cash purchase)."
                />
                <FlexRow
                  label="GRM"
                  value={grm}
                  color={ratingColor("grm", grm)}
                  tooltip="Gross Rent Multiplier = Purchase price / Annual gross rent. Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive. Only meaningful for comparing properties within the same market."
                />
                <FlexRow
                  label="Cap Rate"
                  value={formatPercent(capRate)}
                  color={ratingColor("capRate", capRate)}
                  tooltip="Capitalization Rate = NOI / Property Value × 100. NOI = effective rent − management fees − fixed costs − property tax (before debt service and CapEx). Industry standard for comparing properties regardless of financing. ≥ 6% good, 4-6% average, < 4% low."
                />
                <FlexRow
                  label="1% Rule"
                  value={`${onePercentRule} %`}
                  color={ratingColor("onePercentRule", onePercentRule)}
                  tooltip="Monthly rent / Purchase price × 100. Quick heuristic: ≥ 1% generally indicates a good cash-flowing deal. ≥ 0.7% acceptable in appreciating markets."
                />
                <FlexRow
                  label="OER"
                  value={`${oer} %`}
                  color={ratingColor("oer", oer)}
                  tooltip="Operating Expense Ratio = Total operating expenses / Gross effective income × 100. Lower is better. ≤ 40% excellent, 40-60% normal, > 60% high expense burden."
                />

                {projections && (
                  <>
                    <SectionLabel label={`Projections (year ${projections.period})`} />
                    {projections.hasAppreciation && (
                      <FlexRow
                        label="Property value"
                        value={formatCurrency(String(projections.propertyValue))}
                        tooltip={`Projected property value after ${projections.period} years at ${state.appreciationRate}%/yr appreciation.`}
                      />
                    )}
                    {projections.hasRentIncrease && (
                      <FlexRow
                        label="Monthly rent"
                        value={formatCurrency(String(projections.rentAtEnd))}
                        tooltip={`Projected monthly rent after ${projections.period} years at ${state.rentIncreaseRate}%/yr increase.`}
                      />
                    )}
                    <FlexRow
                      label="Cashflow after loan"
                      value={formatCurrency(String(projections.cashflowAfterLoan))}
                      color={projections.cashflowAfterLoan >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip="Monthly passive income once the loan is fully repaid. Uses projected rent (with annual increase), inflated costs and property tax, and scaled management fees and CapEx."
                    />
                    <FlexRow
                      label="Cumulative cashflow"
                      value={formatCurrency(String(projections.cumulativeCashflow))}
                      color={projections.cumulativeCashflow >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip={`Total cashflow accumulated over ${projections.period} years (starts at −down payment). Includes rent increases, expense inflation, management fees, and CapEx each year.`}
                    />
                    <FlexRow
                      label="Total return"
                      value={formatCurrency(String(projections.totalReturn))}
                      color={projections.totalReturn >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip={`Equity (property value at year ${projections.period}) + cumulative cashflow. The complete picture of your investment.`}
                    />
                    <FlexRow
                      label="Breakeven year"
                      value={projections.breakevenYear !== null ? `Year ${projections.breakevenYear}` : "N/A"}
                      color={projections.breakevenYear !== null ? textCashflowPositive : textCashflowNegative}
                      tooltip="The year when cumulative cashflow first becomes positive (you've recovered your down payment). N/A means the investment never breaks even within the projection horizon."
                    />
                  </>
                )}

                {exitScenario && (
                  <>
                    <SectionLabel label={`Exit scenario (year ${state.exitYear})`} />
                    <FlexRow label="Sale price" value={formatCurrency(String(exitScenario.salePrice))} tooltip={`Estimated sale price at year ${state.exitYear} based on ${state.appreciationRate}%/yr appreciation.`} />
                    <FlexRow label="Capital gain" value={formatCurrency(String(exitScenario.capitalGain))} color={exitScenario.capitalGain >= 0 ? textCashflowPositive : textCashflowNegative} tooltip="Sale price minus original purchase price and renovation." />
                    <FlexRow label="Remaining balance" value={formatCurrency(String(exitScenario.remainingBalance))} tooltip="Outstanding loan balance at the exit year." />
                    <FlexRow
                      label="Total profit"
                      value={formatCurrency(String(exitScenario.totalProfit))}
                      color={exitScenario.totalProfit >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip="Cumulative cashflow + sale price − remaining loan balance. The total money you walk away with."
                    />
                    <FlexRow
                      label="ROI"
                      value={exitScenario.roi === 'N/A' ? 'N/A' : `${exitScenario.roi} %`}
                      color={exitScenario.roi !== 'N/A' && Number(exitScenario.roi) >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip="Total profit / Down payment × 100. Total return on cash invested."
                    />
                    <FlexRow
                      label="Annualized ROI"
                      value={exitScenario.annualizedRoi === 'N/A' ? 'N/A' : `${exitScenario.annualizedRoi} %`}
                      color={exitScenario.annualizedRoi !== 'N/A' && Number(exitScenario.annualizedRoi) >= 0 ? textCashflowPositive : textCashflowNegative}
                      tooltip="Annualized return: the equivalent yearly return rate over the holding period."
                    />
                  </>
                )}

                {stressScenarios.length === 3 && (
                  <>
                    <SectionLabel label="Stress test" />
                    <Box overflowX="auto">
                      <Grid templateColumns="1fr 1fr 1fr 1fr" gap={1} fontSize="xs">
                        <Text fontWeight="bold" color={textLabel}></Text>
                        <Text fontWeight="bold" color="#48BB78" textAlign="center">Optimistic</Text>
                        <Text fontWeight="bold" color="#4299E1" textAlign="center">Base</Text>
                        <Text fontWeight="bold" color="#FC8181" textAlign="center">Pessimistic</Text>

                        <Text color={textLabel}>Cashflow Y1</Text>
                        {stressScenarios.map((s, i) => <Text key={i} textAlign="center">{formatCurrency(String(s.cashflowY1))}</Text>)}

                        <Text color={textLabel}>Cashflow Y10</Text>
                        {stressScenarios.map((s, i) => <Text key={i} textAlign="center">{formatCurrency(String(s.cashflowY10))}</Text>)}

                        <Text color={textLabel}>DSCR</Text>
                        {stressScenarios.map((s, i) => <Text key={i} textAlign="center">{s.dscr}</Text>)}

                        <Text color={textLabel}>Breakeven</Text>
                        {stressScenarios.map((s, i) => <Text key={i} textAlign="center">{s.breakevenYear !== null ? `Y${s.breakevenYear}` : 'N/A'}</Text>)}

                        <Text color={textLabel}>Total return</Text>
                        {stressScenarios.map((s, i) => <Text key={i} textAlign="center">{formatCurrency(String(s.totalReturn))}</Text>)}
                      </Grid>
                    </Box>
                  </>
                )}
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Right column: Inputs */}
        <GridItem order={{ base: 1, md: 2 }}>
          <VStack spacing={6} align="stretch">
            {sections.map((section) => (
              <Box
                key={section.title}
                p={5}
                bg={bgCard}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderInput}
              >
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  mb={4}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  color={textTitle}
                >
                  {section.title}
                </Text>
                <VStack spacing={4}>
                  {section.fields.map(({ key, name, step, placeholder, min, max, tooltip }) => {
                    const isMgmt = key === "managementRate";
                    const displayName = isMgmt && managementRateUnit === "monthsPerYear"
                      ? "Management fees (months/year)"
                      : name;
                    const displayPlaceholder = isMgmt && managementRateUnit === "monthsPerYear" ? "e.g. 1" : placeholder;
                    const displayStep = isMgmt && managementRateUnit === "monthsPerYear" ? 0.1 : step;
                    const displayMax = isMgmt && managementRateUnit === "monthsPerYear" ? 12 : max;
                    return (
                    <FormControl key={key}>
                      <FormLabel fontSize="sm" color={textLabel} mb={1}>
                        <HStack spacing={1} display="inline-flex">
                          <Text as="span">{displayName}</Text>
                          {tooltip && (
                            <Tooltip shouldWrapChildren label={tooltip} fontSize="xs" placement="top" hasArrow maxW="280px">
                              <InfoOutlineIcon boxSize="10px" color={textLabel} cursor="help" opacity={0.5} />
                            </Tooltip>
                          )}
                        </HStack>
                      </FormLabel>
                      <HStack spacing={2} align="stretch">
                        <Input
                          type="number"
                          value={state[key]}
                          onChange={(e) => onChangeState(key, e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          placeholder={displayPlaceholder}
                          min={min ?? 0}
                          max={displayMax}
                          step={displayStep}
                          size="md"
                          borderRadius="md"
                          bg={inputBg}
                          borderColor={borderInput}
                          color={inputText}
                          _placeholder={{ color: inputPlaceholder }}
                          flex={isMgmt ? 1 : undefined}
                        />
                        {isMgmt && (
                          <Menu>
                            <MenuButton
                              as={Button}
                              size="md"
                              variant="outline"
                              borderColor={borderInput}
                              bg={inputBg}
                              color={inputText}
                              fontWeight="normal"
                              minW="110px"
                              aria-label="Management fee unit"
                            >
                              {managementRateUnit === "monthsPerYear" ? "months/yr" : "% of rent"}
                            </MenuButton>
                            <MenuList>
                              <MenuItem onClick={() => onChangeManagementRateUnit("percent")} fontWeight={managementRateUnit === "percent" ? "bold" : "normal"}>
                                % of rent
                              </MenuItem>
                              <MenuItem onClick={() => onChangeManagementRateUnit("monthsPerYear")} fontWeight={managementRateUnit === "monthsPerYear" ? "bold" : "normal"}>
                                months / year
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        )}
                      </HStack>
                    </FormControl>
                    );
                  })}
                </VStack>
              </Box>
            ))}
          </VStack>
        </GridItem>
      </Grid>

      <Charts
        housingPrice={Number(state.housingPrice)}
        notaryFees={Number(state.notaryFees)}
        houseWorks={Number(state.houseWorks)}
        loanAmount={Number(state.bankLoan)}
        grossYield={Number(grossYield)}
        netYield={Number(netYield)}
        cashOnCash={cashOnCash === 'N/A' ? 0 : Number(cashOnCash)}
        bankRate={Number(state.bankRate)}
        bankLoanPeriod={Number(state.bankLoanPeriod)}
        monthlyMortgage={monthlyMortgageExact}
        monthlyRent={Number(state.rent)}
        monthlyCosts={Number(state.monthlyCosts)}
        annualPropertyTax={Number(state.propertyTax)}
        vacancyRate={Number(state.vacancyRate)}
        downPayment={Number(downPayment)}
        appreciationRate={Number(state.appreciationRate)}
        rentIncreaseRate={Number(state.rentIncreaseRate)}
        expenseInflationRate={Number(state.expenseInflationRate)}
        managementRate={effectiveMgmtRatePercent}
        capexRate={Number(state.capexRate)}
        exitYear={Number(state.exitYear)}
        dscr={dscr === '∞' ? Infinity : Number(dscr)}
        grm={Number(grm)}
        totalPrice={Number(totalPrice)}
        currency={currency}
      />
    </Box>
  );
};

const SectionLabel: React.FC<{ label: string }> = ({ label }) => {
  const color = useColorModeValue("gray.400", "gray.500");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  return (
    <Box borderTopWidth="1px" borderColor={borderColor} pt={2} mt={1}>
      <Text fontSize="xs" fontWeight="bold" color={color} textTransform="uppercase" letterSpacing="wider">
        {label}
      </Text>
    </Box>
  );
};

const FlexRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  tooltip?: string;
}> = ({ label, value, color, tooltip }) => {
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const iconColor = useColorModeValue("gray.300", "gray.600");
  const defaultColor = useColorModeValue("gray.900", "gray.100");
  const valueColor = color ?? defaultColor;
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      fontSize="sm"
    >
      <HStack spacing={1}>
        <Text color={labelColor}>{label}</Text>
        {tooltip && (
          <Tooltip shouldWrapChildren label={tooltip} fontSize="xs" placement="top" hasArrow maxW="240px">
            <InfoOutlineIcon boxSize="10px" color={iconColor} cursor="help" />
          </Tooltip>
        )}
      </HStack>
      <Text fontWeight="semibold" color={valueColor}>
        {value}
      </Text>
    </Box>
  );
};

const formulas = [
  {
    title: "Total Investment",
    formula: "Total investment = Purchase price + Closing costs + Renovation budget",
  },
  {
    title: "Down Payment",
    formula: "Down payment = Total investment - Loan amount",
    note: "The cash you put in upfront.",
  },
  {
    title: "Loan-to-Value (LTV)",
    formula: "LTV = (Loan amount / Purchase price) x 100",
    note: "Banks typically require LTV <= 80%.",
  },
  {
    title: "Monthly Mortgage Payment",
    formula: "M = P x [t(1+t)^n] / [(1+t)^n - 1]",
    note: "P = loan amount, t = monthly rate (annual rate / 12 / 100), n = total months. If rate = 0%, then M = P / n.",
  },
  {
    title: "Total Mortgage Interest",
    formula: "Total interest = (Monthly payment x Total months) - Loan amount",
  },
  {
    title: "Total Mortgage Cost",
    formula: "Total repaid = Loan amount + Total interest",
  },
  {
    title: "Total Operation Cost",
    formula: "Total operation cost = Total investment + Total interest paid",
    note: "The real total spent over the full loan duration.",
  },
  {
    title: "Net Monthly Income",
    formula: "Effective rent = Monthly rent x (1 - Vacancy rate / 100)\nManagement fees = Effective rent x (Management rate / 100)\nCapEx = Monthly rent x (CapEx rate / 100)\nNet income = Effective rent - Management fees - CapEx - Monthly fixed costs - Property tax / 12",
  },
  {
    title: "Monthly Cashflow",
    formula: "Cashflow = Net monthly income - Monthly mortgage payment",
    note: "Positive = the property pays for itself.",
  },
  {
    title: "Break-Even Rent",
    formula: "Break-even = (Monthly costs + Property tax / 12 + Mortgage) / ((1 - Vacancy / 100) x (1 - Mgmt / 100) - CapEx / 100)",
    note: "Minimum monthly rent to reach zero cashflow. Accounts for vacancy, management fees, and CapEx reserve.",
  },
  {
    title: "Gross Yield",
    formula: "Gross yield = (Monthly rent x 12 / Total investment) x 100",
    note: "Does not account for expenses.",
  },
  {
    title: "Net Yield",
    formula: "Net yield = (Net monthly income x 12 / Total investment) x 100",
    note: "Target: > 5% excellent, 3-5% good, < 3% low.",
  },
  {
    title: "Cash-on-Cash Return",
    formula: "Cash-on-cash = (Monthly cashflow x 12 / Down payment) x 100",
    note: "Target: > 8% excellent, 4-8% good. N/A when no equity is at risk (100% financed, or a loan larger than the total cost).",
  },
  {
    title: "DSCR (Debt Service Coverage Ratio)",
    formula: "DSCR = Monthly NOI / Monthly mortgage payment\nMonthly NOI = Effective rent - Management fees - Fixed costs - Property tax / 12",
    note: "Measured on NOI, like a lender does: the CapEx reserve is a capital provision, not an operating expense, so it is excluded here exactly as it is from the cap rate. >= 1.5 = excellent, >= 1.25 = good (standard lender minimum), >= 1.0 = covers debt (tight), < 1.0 = deficit. N/A if no mortgage.",
  },
  {
    title: "GRM (Gross Rent Multiplier)",
    formula: "GRM = Purchase price / (Monthly rent x 12)",
    note: "Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive.",
  },
  {
    title: "Equity Build-Up",
    formula: "Equity (loan repayment) = Property base value - Remaining balance\nEquity (appreciation) = Base value x (1 + Rate)^Y - Base value\nTotal equity = Equity (loan repayment) + Equity (appreciation)",
    note: "Property base value = Purchase price + Renovation budget, so closing costs are not counted as equity in the property. Either band can go negative - appreciation when prices fall, loan repayment when the loan exceeds the property value. Appreciation applies to property value only, not rent.",
  },
  {
    title: "Cumulative Cashflow Projection",
    formula: "Year 0: -Down payment\nYear Y: Previous + Annual cashflow (yr Y)\nAnnual cashflow (yr Y) = Effective rent - Management fees - CapEx - Inflated costs - Inflated tax / 12 - Mortgage",
    note: "Rent increases annually. Costs and property tax are inflated by the expense inflation rate. Management fees and CapEx scale with rent. Property appreciation is not included here — see Equity Build-Up for that.",
  },
  {
    title: "Amortization (per month)",
    formula: "Interest = Remaining balance x Monthly rate\nPrincipal = Monthly payment - Interest\nNew balance = Remaining balance - Principal",
  },
  {
    title: "Cashflow After Loan",
    formula: "Rent at year N = Monthly rent x (1 + Rent increase / 100)^N\nEffective rent = Rent at year N x (1 - Vacancy / 100)\nCashflow after loan = Effective rent - Management fees - CapEx - Inflated costs - Inflated tax / 12",
    note: "Monthly passive income once the loan is fully repaid. Costs and tax are inflated to year N. Management fees and CapEx scale with projected rent.",
  },
  {
    title: "Annual Cashflow",
    formula: "Annual cashflow (yr Y) = (Net income at yr Y - Mortgage) x 12\nNet income = Effective rent - Management fees - CapEx - Inflated costs - Inflated tax / 12\nMortgage = Monthly payment if Y <= Loan term, else 0",
    note: "Same logic as cumulative cashflow, but shows each year individually. Expenses grow with inflation rate. Management fees and CapEx scale with rent. Green = profit, red = loss.",
  },
  {
    title: "Income vs Expenses",
    formula: "Annual income = Effective rent x 12\nAnnual expenses = Mortgage x 12 + (Inflated costs + Management fees + CapEx) x 12 + Inflated tax",
    note: "Expenses grow with the inflation rate. Management fees and CapEx scale with rent. After the loan ends, expenses drop sharply.",
  },
  {
    title: "Total Return on Investment",
    formula: "Total return = Cumulative cashflow + Equity\nEquity = Property value - Remaining loan balance\nCumulative cashflow = Sum of all annual cashflows - Down payment",
    note: "The complete picture: combines rental cashflow and property equity into one metric.",
  },
  {
    title: "CapEx Reserve",
    formula: "CapEx (monthly) = Monthly gross rent x CapEx rate / 100",
    note: "Capital expenditure reserve for major repairs (roof, HVAC, etc.). Deducted from net income. Scales with rent since it's a percentage of gross rent.",
  },
  {
    title: "Management Fee Unit Conversion",
    formula: "If unit = '%': effective monthly rate = managementRate / 100\nIf unit = 'months/year': effective monthly rate = managementRate / 12\nEquivalence: X months/year = (X × 100 / 12) % per month",
    note: "The management fee can be entered either as a percentage of monthly rent or as months of rent per year. The two are equivalent: 1 month/year ≈ 8.33%/mo, 1.5 months/year ≈ 12.5%/mo. All downstream calculations use the % form.",
  },
  {
    title: "Cap Rate",
    formula: "NOI = (Effective rent - Management fees - Fixed costs - Property tax / 12) x 12\nCap Rate = NOI / Property value x 100",
    note: "Capitalization Rate. NOI excludes debt service and CapEx reserve (industry standard). Property value = Purchase price + Renovation. ≥ 6% good, 4-6% average, < 4% low.",
  },
  {
    title: "1% Rule",
    formula: "1% Rule = Monthly rent / Purchase price x 100",
    note: "Quick heuristic: ≥ 1% generally indicates a good cash-flowing deal. ≥ 0.7% acceptable in appreciating markets. Does not account for expenses.",
  },
  {
    title: "Operating Expense Ratio (OER)",
    formula: "Operating expenses = Effective rent - Net income (before mortgage)\nOER = Operating expenses / Effective rent x 100",
    note: "What percentage of income is consumed by operating expenses (excluding mortgage). ≤ 40% excellent, 40-60% normal, > 60% high expense burden.",
  },
  {
    title: "Cashflow Waterfall",
    formula: "Gross rent → -Vacancy → Effective rent → -Management → -CapEx → -Fixed costs → -Tax → Net income → -Mortgage → Cashflow",
    note: "Step-by-step decomposition of monthly income showing every deduction from gross rent to final cashflow.",
  },
  {
    title: "Interest Rate Sensitivity",
    formula: "For each rate variation (-2% to +2%):\nMonthly payment = P x [t(1+t)^n] / [(1+t)^n - 1]\nCashflow = Net income - Monthly payment\nDSCR = Net income / Monthly payment",
    note: "Shows how sensitive your deal is to interest rate changes. Critical for variable-rate loans and refinancing decisions.",
  },
  {
    title: "Breakeven Year",
    formula: "Breakeven year = First year where Cumulative cashflow >= 0",
    note: "The year when total rental income (minus all costs) recovers the initial down payment. N/A if the investment never breaks even within the projection horizon.",
  },
  {
    title: "Exit Scenario (Sale Simulation)",
    formula: "Sale price = (Purchase price + Renovation) x (1 + Appreciation)^N\nRemaining balance = Outstanding loan at year N\nCapital gain = Sale price - Purchase price - Renovation\nTotal profit = Cumulative cashflow + Sale price - Remaining balance\nROI = Total profit / Down payment x 100\nAnnualized ROI = ((1 + ROI/100)^(1/N) - 1) x 100",
    note: "Simulates selling the property at a chosen year. Accounts for all cashflows, loan paydown, and appreciation.",
  },
  {
    title: "Stress Test Scenarios",
    formula: "Optimistic: Vacancy x 0.5, Rent increase + 1%\nBase: Your inputs as-is\nPessimistic: Vacancy x 2, Rent increase = 0%, Expense inflation + 1%",
    note: "Automatically generated scenarios to stress-test the deal. Shows the range of possible outcomes.",
  },
  {
    title: "Deal Profile (Radar Chart)",
    formula: "Each metric scored 0-100:\nDSCR: <1.0 → 10, 1.0-1.24 → 40, 1.25-1.49 → 70, ≥1.5 → 100\nCash-on-Cash: <0 → 10, 0-4 → 40, 4-8 → 70, ≥8 → 100\nNet Yield: <3 → 10, 3-5 → 40, 5-7 → 70, ≥7 → 100\nGRM (inverted): >20 → 10, 15-20 → 40, 10-15 → 70, <10 → 100",
    note: "Visual profile showing strengths and weaknesses across 4 key metrics. Higher scores = better.",
  },
  {
    title: "Expense Decomposition",
    formula: "Fixed costs (yr Y) = Monthly costs x (1 + Inflation)^(Y-1) x 12\nProperty tax (yr Y) = Annual tax x (1 + Inflation)^(Y-1)\nManagement fees (yr Y) = Effective rent x Mgmt% x 12\nCapEx (yr Y) = Gross rent x CapEx% x 12",
    note: "Shows how each expense category evolves over time. Fixed costs and tax grow with inflation, while management fees and CapEx scale with rent.",
  },
];

const FormulasModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const codeBg = useColorModeValue("gray.50", "gray.900");
  const noteColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg">Formulas</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            {formulas.map((f) => (
              <Box key={f.title}>
                <Text fontWeight="semibold" fontSize="sm" mb={1}>
                  {f.title}
                </Text>
                <Code
                  display="block"
                  whiteSpace="pre-wrap"
                  p={3}
                  borderRadius="md"
                  bg={codeBg}
                  fontSize="xs"
                >
                  {f.formula}
                </Code>
                {f.note && (
                  <Text fontSize="xs" color={noteColor} mt={1}>
                    {f.note}
                  </Text>
                )}
              </Box>
            ))}
          </Grid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default Home;
