import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";

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
  getDownPayment,
  getTotalMortgageInterest,
  getMonthlyMortgagePayment,
  getNetMonthlyIncomeDetailed,
  getTotalMortgageCost,
  getTotalPurchasePrice,
  getYield,
  getTotalOperationCost,
  getCashOnCash,
  getBreakEvenRent,
  getLTV,
  getDSCR,
  getGRM,
} from "../utils";

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
  | "vacancyRate"
  | "appreciationRate"
  | "rentIncreaseRate";

type Field = {
  key: Key;
  name: string;
  step: number;
  placeholder: string;
  min?: number;
  max?: number;
};

type Section = {
  title: string;
  fields: Field[];
};

const sections: Section[] = [
  {
    title: "Property 🏠",
    fields: [
      { key: "housingPrice", name: "Purchase price", step: 10000, placeholder: "e.g. 150,000", min: 0 },
      { key: "notaryFees", name: "Closing costs (notary, agency...)", step: 1000, placeholder: "e.g. 12,000", min: 0 },
      { key: "houseWorks", name: "Renovation budget", step: 1000, placeholder: "0", min: 0 },
      { key: "appreciationRate", name: "Annual property appreciation (%)", step: 0.5, placeholder: "e.g. 2", min: -10, max: 20 },
    ],
  },
  {
    title: "Mortgage 💳",
    fields: [
      { key: "bankLoan", name: "Loan amount", step: 10000, placeholder: "e.g. 150,000", min: 0 },
      { key: "bankRate", name: "Interest rate (%)", step: 0.1, placeholder: "e.g. 3.5", min: 0, max: 20 },
      { key: "bankLoanPeriod", name: "Loan term (years)", step: 1, placeholder: "e.g. 20", min: 1, max: 50 },
    ],
  },
  {
    title: "Rental 💰",
    fields: [
      { key: "rent", name: "Monthly rent", step: 100, placeholder: "e.g. 750", min: 0 },
      { key: "propertyTax", name: "Annual property tax", step: 100, placeholder: "e.g. 1,000", min: 0 },
      { key: "monthlyCosts", name: "Monthly costs (charges, insurance, maintenance...)", step: 50, placeholder: "e.g. 150", min: 0 },
      { key: "vacancyRate", name: "Vacancy rate (%)", step: 1, placeholder: "e.g. 5", min: 0, max: 100 },
      { key: "rentIncreaseRate", name: "Annual rent increase (%)", step: 0.5, placeholder: "e.g. 1.5", min: -10, max: 20 },
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
  bankLoan: 150000,
  bankRate: 3.5,
  bankLoanPeriod: 20,
  rent: 750,
  propertyTax: 1000,
  monthlyCosts: 150,
  vacancyRate: 5,
  appreciationRate: 0,
  rentIncreaseRate: 0,
};

const Home: NextPage = () => {
  const router = useRouter();
  const [state, setState] = useState<State>(defaultState);
  const [currency, setCurrency] = useState<Currency>("EUR");
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

  // Sync state from URL when query params are present
  useEffect(() => {
    if (Object.keys(router.query).length > 0) {
      setState({ ...defaultState, ...(router.query as unknown as State) });
      const urlCurrency = router.query.currency as string | undefined;
      if (urlCurrency && CURRENCIES.some((c) => c.code === urlCurrency)) {
        setCurrency(urlCurrency as Currency);
      }
    }
  }, [router.query]);

  // On first load with no params, push defaults to URL so it's shareable
  useEffect(() => {
    if (!router.isReady) return;
    if (Object.keys(router.query).length === 0) {
      void router.replace(
        { query: { ...defaultState, currency: "EUR" } as unknown as Record<string, string> },
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

  const totalPrice = useMemo(
    () => getTotalPurchasePrice(state.housingPrice, state.notaryFees, state.houseWorks),
    [state.housingPrice, state.notaryFees, state.houseWorks]
  );

  const downPayment = useMemo(
    () => getDownPayment(state.bankLoan, totalPrice),
    [state.bankLoan, totalPrice]
  );

  const monthlyMortgagePayment = useMemo(
    () =>
      getMonthlyMortgagePayment(
        state.bankLoan,
        state.bankRate,
        state.bankLoanPeriod
      ),
    [state.bankLoan, state.bankRate, state.bankLoanPeriod]
  );

  const totalMortgageInterest = useMemo(
    () =>
      getTotalMortgageInterest(
        state.bankLoan,
        state.bankLoanPeriod,
        monthlyMortgagePayment
      ),
    [state.bankLoan, state.bankLoanPeriod, monthlyMortgagePayment]
  );

  const totalMortgageCost = useMemo(
    () => getTotalMortgageCost(state.bankLoan, totalMortgageInterest),
    [state.bankLoan, totalMortgageInterest]
  );

  const netMonthlyIncome = useMemo(
    () =>
      getNetMonthlyIncomeDetailed(
        state.rent,
        state.monthlyCosts,
        state.propertyTax,
        "0",
        "0",
        "0",
        state.vacancyRate
      ),
    [state.rent, state.monthlyCosts, state.propertyTax, state.vacancyRate]
  );

  const grossYield = useMemo(
    () => getYield(Number(state.rent) * 12, totalPrice),
    [state.rent, totalPrice]
  );

  const netYield = useMemo(
    () => getYield(Number(netMonthlyIncome) * 12, totalPrice),
    [netMonthlyIncome, totalPrice]
  );

  const cashflow = useMemo(() => {
    const monthly = Number(netMonthlyIncome) - Number(monthlyMortgagePayment);
    return Number.isNaN(monthly) ? "0" : monthly.toFixed(0);
  }, [netMonthlyIncome, monthlyMortgagePayment]);

  const totalOperationCost = useMemo(
    () => getTotalOperationCost(totalPrice, totalMortgageInterest),
    [totalPrice, totalMortgageInterest]
  );

  const cashOnCash = useMemo(
    () => getCashOnCash(Number(cashflow) * 12, downPayment),
    [cashflow, downPayment]
  );

  const breakEvenRent = useMemo(
    () => getBreakEvenRent(state.monthlyCosts, state.propertyTax, monthlyMortgagePayment, state.vacancyRate),
    [state.monthlyCosts, state.propertyTax, monthlyMortgagePayment, state.vacancyRate]
  );

  const ltv = useMemo(
    () => getLTV(state.bankLoan, state.housingPrice),
    [state.bankLoan, state.housingPrice]
  );

  const dscr = useMemo(
    () => getDSCR(netMonthlyIncome, monthlyMortgagePayment),
    [netMonthlyIncome, monthlyMortgagePayment]
  );

  const grm = useMemo(
    () => getGRM(state.housingPrice, Number(state.rent) * 12),
    [state.housingPrice, state.rent]
  );

  const onReset = () => {
    setState(defaultState);
    setCurrency("EUR");
    void router.replace(
      { query: { ...defaultState, currency: "EUR" } as unknown as Record<string, string> },
      undefined,
      { shallow: true }
    );
  };

  const onExport = () => {
    // Remove currency formatting for Excel (use raw numbers)
    const stripCurrency = (value: string): number => {
      return Number(value.replace(/[^0-9.-]+/g, ""));
    };

    const stripPercent = (value: string): number => {
      return Number(value.replace(/[^0-9.-]+/g, ""));
    };

    const workbook = XLSX.utils.book_new();

    // Purchase sheet
    const purchaseData = [
      ["Item", "Amount"],
      ["Purchase price", stripCurrency(String(state.housingPrice))],
      ["Closing costs", stripCurrency(String(state.notaryFees))],
      ["Renovation budget", stripCurrency(String(state.houseWorks))],
      ["Total", stripCurrency(totalPrice)],
    ];
    const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
    XLSX.utils.book_append_sheet(workbook, purchaseSheet, "Purchase");

    // Mortgage sheet
    const mortgageData = [
      ["Item", "Amount", "Note"],
      ["Loan amount", stripCurrency(String(state.bankLoan)), ""],
      ["Interest rate", `${Number(state.bankRate).toFixed(2)} %`, "Annual"],
      ["Duration", state.bankLoanPeriod, "Years"],
      ["Monthly payment", stripCurrency(monthlyMortgagePayment), ""],
      ["Total credit cost", stripCurrency(totalMortgageCost), ""],
      ["Total interest", stripCurrency(totalMortgageInterest), ""],
    ];
    const mortgageSheet = XLSX.utils.aoa_to_sheet(mortgageData);
    XLSX.utils.book_append_sheet(workbook, mortgageSheet, "Mortgage");

    // Rental sheet
    const effectiveRent =
      stripCurrency(String(state.rent)) * (1 - Number(state.vacancyRate) / 100);
    const rentalData = [
      ["Item", "Amount (Monthly)", "Amount (Annual)"],
      ["Gross rent", stripCurrency(String(state.rent)), stripCurrency(String(state.rent)) * 12],
      ["Vacancy rate", `${Number(state.vacancyRate)} %`, ""],
      ["Effective rent (after vacancy)", effectiveRent, effectiveRent * 12],
      ["Monthly costs (charges, insurance, maintenance)", stripCurrency(String(state.monthlyCosts)), stripCurrency(String(state.monthlyCosts)) * 12],
      ["Property tax", stripCurrency(String(state.propertyTax)) / 12, stripCurrency(String(state.propertyTax))],
      ["Net monthly income", stripCurrency(netMonthlyIncome), stripCurrency(netMonthlyIncome) * 12],
    ];
    const rentalSheet = XLSX.utils.aoa_to_sheet(rentalData);
    XLSX.utils.book_append_sheet(workbook, rentalSheet, "Rental");

    // Results sheet
    const resultsData = [
      ["Metric", "Value", "Note"],
      ["Total investment cost", stripCurrency(totalPrice), ""],
      ["Down payment", stripCurrency(downPayment), ""],
      ["Monthly mortgage payment", stripCurrency(monthlyMortgagePayment), ""],
      ["Net monthly income (all-in)", stripCurrency(netMonthlyIncome), "After all expenses"],
      ["Monthly cashflow", stripCurrency(cashflow), "Net income - Mortgage"],
      ["Annual cashflow", stripCurrency(cashflow) * 12, ""],
      ["Gross yield", stripPercent(grossYield) / 100, "Format: decimal"],
      ["Net yield", stripPercent(netYield) / 100, "Format: decimal"],
      ["Total interest paid", stripCurrency(totalMortgageInterest), ""],
      ["Cash-on-cash return", stripPercent(cashOnCash) / 100, "Format: decimal"],
      ["DSCR", Number(dscr), "Debt Service Coverage Ratio"],
      ["GRM", Number(grm), "Gross Rent Multiplier"],
      ["Appreciation rate", `${Number(state.appreciationRate)} %`, "Annual (property value)"],
      ["Rent increase rate", `${Number(state.rentIncreaseRate)} %`, "Annual"],
    ];
    const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
    XLSX.utils.book_append_sheet(workbook, resultsSheet, "Results");

    // Generate and download
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
                  <Box fontSize="xs" mt={0.5}>Annual: {formatCurrency(String(Number(cashflow) * 12))}</Box>
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
                  color={Number(netYield) >= 3 ? textRendementBon : textRendementFaible}
                  fontWeight="bold"
                >
                  {formatPercent(netYield)}
                </StatNumber>
                <StatHelpText>
                  {Number(netYield) >= 5
                    ? "🎯 Excellent"
                    : Number(netYield) >= 3
                      ? "👍 Good"
                      : "⚠️ Low"}
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
                <FlexRow label="Loan-to-Value (LTV)" value={formatPercent(ltv)} tooltip="(Loan amount / Purchase price) × 100. Banks typically require LTV ≤ 80%. Higher LTV = more leveraged." color={Number(ltv) > 90 ? textCashflowNegative : Number(ltv) > 80 ? textInterest : undefined} />

                <SectionLabel label="Credit" />
                <FlexRow label="Monthly payment" value={formatCurrency(monthlyMortgagePayment)} tooltip="Fixed monthly mortgage payment: P × [t(1+t)^n] / [(1+t)^n − 1]" />
                <FlexRow label="Interest paid" value={formatCurrency(totalMortgageInterest)} color={textInterest} tooltip="Total interest paid to the bank over the full loan term." />
                <FlexRow label="Total repaid" value={formatCurrency(totalMortgageCost)} tooltip="Loan amount + total interest paid. What you actually pay back to the bank." />
                <FlexRow label="Total operation cost" value={formatCurrency(totalOperationCost)} tooltip="Total investment + total interest paid. The true all-in cost of the operation." />

                <SectionLabel label="Rental" />
                <FlexRow label="Net monthly income" value={formatCurrency(netMonthlyIncome)} color={textRevenu} tooltip="Effective rent (gross rent × (1 − vacancy rate)) − monthly costs − property tax / 12" />
                <FlexRow
                  label="Monthly cashflow"
                  value={formatCurrency(cashflow)}
                  color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="Net monthly income − monthly mortgage payment. Positive means the property pays for itself."
                />
                <FlexRow
                  label="Annual cashflow"
                  value={formatCurrency(String(Number(cashflow) * 12))}
                  color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="Monthly cashflow × 12. Total gain or loss per year after all costs and mortgage."
                />
                <FlexRow label="Break-even rent" value={formatCurrency(breakEvenRent)} tooltip="Minimum monthly rent to reach zero cashflow: (costs + tax/12 + mortgage) / (1 − vacancy rate)" />

                <SectionLabel label="Performance" />
                <FlexRow label="Gross yield" value={formatPercent(grossYield)} tooltip="(Annual rent / Total investment) × 100. Does not account for expenses — use net yield for a realistic view." />
                <FlexRow label="Net yield" value={formatPercent(netYield)} color={Number(netYield) >= 3 ? textRendementBon : textRendementFaible} tooltip="(Net annual income / Total investment) × 100. More realistic than gross yield — accounts for vacancy, costs and taxes. Target: >5% excellent, 3-5% good." />
                <FlexRow
                  label="Cash-on-cash return"
                  value={formatPercent(cashOnCash)}
                  color={Number(cashOnCash) >= 0 ? textCashflowPositive : textCashflowNegative}
                  tooltip="(Annual cashflow / Down payment) × 100. The actual return on the cash you invested. Target: >8% excellent, 4-8% good."
                />
                <FlexRow
                  label="DSCR"
                  value={dscr}
                  color={Number(dscr) >= 1.25 ? textRendementBon : Number(dscr) >= 1 ? textInterest : textCashflowNegative}
                  tooltip="Debt Service Coverage Ratio = Net income / Mortgage payment. Banks require ≥ 1.25. Above 1.0 means the property covers its debt."
                />
                <FlexRow
                  label="GRM"
                  value={grm}
                  color={Number(grm) <= 15 ? textRendementBon : Number(grm) <= 20 ? textRendementFaible : textCashflowNegative}
                  tooltip="Gross Rent Multiplier = Purchase price / Annual gross rent. Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive."
                />
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
                  {section.fields.map(({ key, name, step, placeholder, min, max }) => (
                    <FormControl key={key}>
                      <FormLabel fontSize="sm" color={textLabel} mb={1}>
                        {name}
                      </FormLabel>
                      <Input
                        type="number"
                        value={state[key]}
                        onChange={(e) => onChangeState(key, e.target.value)}
                        placeholder={placeholder}
                        min={min ?? 0}
                        max={max}
                        step={step}
                        size="md"
                        borderRadius="md"
                        bg={inputBg}
                        borderColor={borderInput}
                        color={inputText}
                        _placeholder={{ color: inputPlaceholder }}
                      />
                    </FormControl>
                  ))}
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
        cashOnCash={Number(cashOnCash)}
        bankRate={Number(state.bankRate)}
        bankLoanPeriod={Number(state.bankLoanPeriod)}
        monthlyMortgage={Number(monthlyMortgagePayment)}
        monthlyRent={Number(state.rent)}
        monthlyCosts={Number(state.monthlyCosts)}
        annualPropertyTax={Number(state.propertyTax)}
        vacancyRate={Number(state.vacancyRate)}
        downPayment={Number(downPayment)}
        appreciationRate={Number(state.appreciationRate)}
        rentIncreaseRate={Number(state.rentIncreaseRate)}
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
    formula: "Effective rent = Monthly rent x (1 - Vacancy rate / 100)\nNet income = Effective rent - Monthly costs - Property tax / 12",
  },
  {
    title: "Monthly Cashflow",
    formula: "Cashflow = Net monthly income - Monthly mortgage payment",
    note: "Positive = the property pays for itself.",
  },
  {
    title: "Break-Even Rent",
    formula: "Break-even = (Monthly costs + Property tax / 12 + Mortgage) / (1 - Vacancy rate / 100)",
    note: "Minimum monthly rent to reach zero cashflow.",
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
    note: "Target: > 8% excellent, 4-8% good.",
  },
  {
    title: "DSCR (Debt Service Coverage Ratio)",
    formula: "DSCR = Net monthly income / Monthly mortgage payment",
    note: "The ratio banks use. >= 1.25 = good, >= 1.0 = covers debt, < 1.0 = deficit.",
  },
  {
    title: "GRM (Gross Rent Multiplier)",
    formula: "GRM = Purchase price / (Monthly rent x 12)",
    note: "Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive.",
  },
  {
    title: "Equity Build-Up",
    formula: "Equity (payments) = Property base value - Remaining balance\nEquity (appreciation) = Base value x (1 + Rate)^Y - Base value\nTotal equity = Equity (payments) + Equity (appreciation)",
    note: "Property base value = Purchase price + Renovation budget. The appreciation rate applies to property value only, not rent.",
  },
  {
    title: "Cumulative Cashflow Projection",
    formula: "Year 0: -Down payment\nYear Y: Previous + Annual cashflow (yr Y)\nAnnual cashflow (yr Y) = (Cashflow at yr 0) adjusted for rent increase",
    note: "If annual rent increase > 0%, the cashflow grows each year as rent rises. Property appreciation is not included here — see Equity Build-Up for that.",
  },
  {
    title: "Amortization (per month)",
    formula: "Interest = Remaining balance x Monthly rate\nPrincipal = Monthly payment - Interest\nNew balance = Remaining balance - Principal",
  },
  {
    title: "Annual Cashflow",
    formula: "Annual cashflow (yr Y) = (Net income at yr Y - Mortgage) x 12\nMortgage = Monthly payment if Y <= Loan term, else 0",
    note: "Same logic as cumulative cashflow, but shows each year individually. Green = profit, red = loss.",
  },
  {
    title: "Income vs Expenses",
    formula: "Annual income = Effective rent x 12\nAnnual expenses = Mortgage x 12 + Monthly costs x 12 + Property tax",
    note: "The gap between income and expenses is your annual cashflow. After the loan ends, expenses drop sharply.",
  },
  {
    title: "Total Return on Investment",
    formula: "Total return = Cumulative cashflow + Equity\nEquity = Property value - Remaining loan balance\nCumulative cashflow = Sum of all annual cashflows - Down payment",
    note: "The complete picture: combines rental cashflow and property equity into one metric.",
  },
];

const FormulasModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const codeBg = useColorModeValue("gray.50", "gray.700");
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
