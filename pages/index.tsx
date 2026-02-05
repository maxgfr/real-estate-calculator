import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";
import {
  Box,
  Button,
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
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  useColorMode,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

import {
  getDownPayment,
  getTotalMortgageInterest,
  getMonthlyMortgagePayment,
  getNetMonthlyIncomeMixed,
  getTotalMortgageCost,
  getTotalPurchasePrice,
  getYield,
} from "../utils";

const sections = [
  {
    title: "Property 🏠",
    fields: [
      { key: "housingPrice", name: "Purchase price", step: 10000 },
      { key: "notaryFees", name: "Closing costs", step: 1000 },
      { key: "houseWorks", name: "Renovation budget", step: 1000 },
    ],
  },
  {
    title: "Mortgage 💳",
    fields: [
      { key: "bankLoan", name: "Loan amount", step: 10000 },
      { key: "bankRate", name: "Interest rate", step: 0.1 },
      { key: "bankLoanPeriod", name: "Loan term", step: 1 },
    ],
  },
  {
    title: "Rental Income 💰",
    fields: [
      { key: "rent", name: "Monthly rent", step: 100 },
      { key: "rentalCharges", name: "Monthly building fees", step: 50 },
      { key: "propertyTax", name: "Annual property tax", step: 100 },
    ],
  },
] as const;

type Key = (typeof sections)[number]["fields"][number]["key"];

type State = {
  [key in Key]: string | number;
};

const formatCurrency = (value: string): string =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  });

const formatPercent = (value: string): string =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " %";

const defaultState: State = {
  housingPrice: "",
  notaryFees: "",
  houseWorks: "",
  bankLoan: "",
  bankRate: "",
  bankLoanPeriod: "",
  rent: "",
  rentalCharges: "",
  propertyTax: "",
};

const Home: NextPage = () => {
  const router = useRouter();
  const [state, setState] = useState<State>(defaultState);
  const { colorMode, setColorMode } = useColorMode();

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

  useEffect(() => {
    if (Object.keys(router.query).length > 0) {
      setState({ ...defaultState, ...(router.query as unknown as State) });
    }
  }, [router.query]);

  const onChangeState = (key: string, value: string) => {
    const newState = { ...state, [key]: value };
    setState(newState);
    const query = { ...router.query, [key]: value };
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
    () => getNetMonthlyIncomeMixed(state.rent, state.rentalCharges, state.propertyTax),
    [state.rent, state.rentalCharges, state.propertyTax]
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

  const onReset = () => {
    setState(defaultState);
    void router.replace({ query: {} }, undefined, { shallow: true });
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
    const rentalData = [
      ["Item", "Amount (Monthly)", "Amount (Annual)"],
      ["Monthly rent", stripCurrency(String(state.rent)), stripCurrency(String(state.rent)) * 12],
      ["Monthly building fees", stripCurrency(String(state.rentalCharges)), stripCurrency(String(state.rentalCharges)) * 12],
      ["Property tax", stripCurrency(String(state.propertyTax)) / 12, stripCurrency(String(state.propertyTax))],
      ["Net monthly income", stripCurrency(netMonthlyIncome), stripCurrency(netMonthlyIncome) * 12],
    ];
    const rentalSheet = XLSX.utils.aoa_to_sheet(rentalData);
    XLSX.utils.book_append_sheet(workbook, rentalSheet, "Rental");

    // Results sheet
    const resultsData = [
      ["Metric", "Value"],
      ["Total investment cost", stripCurrency(totalPrice)],
      ["Down payment", stripCurrency(downPayment)],
      ["Monthly cashflow", stripCurrency(cashflow)],
      ["Annual cashflow", stripCurrency(cashflow) * 12],
      ["Gross yield", stripPercent(grossYield) / 100, "Format: decimal"],
      ["Net yield", stripPercent(netYield) / 100, "Format: decimal"],
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
        <title>Estate Calc - Real Estate ROI Calculator</title>
        <meta
          name="description"
          content="Calculate rental property ROI, cashflow, and yield. Free Excel export. Make smarter real estate investment decisions."
        />
        <meta name="keywords" content="real estate calculator, rental yield, cashflow calculator, mortgage calculator, investment property ROI, landlord tools" />
        <link rel="canonical" href="https://yourusername.github.io/estate-calc/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Estate Calc - Real Estate ROI Calculator" />
        <meta property="og:description" content="Calculate rental property ROI, cashflow, and yield. Free Excel export. Make smarter real estate investment decisions." />
        <meta property="og:url" content="https://yourusername.github.io/estate-calc/" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Estate Calc - Real Estate ROI Calculator" />
        <meta name="twitter:description" content="Calculate rental property ROI, cashflow, and yield. Free Excel export." />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Estate Calc - Real Estate ROI Calculator",
              "description": "Calculate rental property ROI, cashflow, and yield. Free Excel export for real estate investors.",
              "url": "https://yourusername.github.io/estate-calc/",
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
                "name": "estate-calc"
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
              "name": "Estate Calc",
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
                  Monthly cashflow
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
                <StatHelpText>
                  {Number(cashflow) >= 0 ? "✨ Positive" : "⚠️ Negative"}
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
                  Net yield
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
                <FlexRow
                  label="Total investment cost"
                  value={formatCurrency(totalPrice)}
                />
                <FlexRow
                  label="Down payment"
                  value={formatCurrency(downPayment)}
                />
                <FlexRow
                  label="Monthly mortgage payment"
                  value={formatCurrency(monthlyMortgagePayment)}
                />
                <FlexRow
                  label="Net monthly rental income"
                  value={formatCurrency(netMonthlyIncome)}
                  color={textRevenu}
                />
                <FlexRow label="Gross yield" value={formatPercent(grossYield)} />
                <Box borderTopWidth="1px" pt={2} mt={2} borderColor={borderInput}>
                  <FlexRow
                    label="Total interest"
                    value={formatCurrency(totalMortgageInterest)}
                    color={textInterest}
                  />
                </Box>
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
                  {section.fields.map(({ key, name, step }) => (
                    <FormControl key={key}>
                      <FormLabel fontSize="sm" color={textLabel} mb={1}>
                        {name}
                      </FormLabel>
                      <Input
                        type="number"
                        value={state[key]}
                        onChange={(e) => onChangeState(key, e.target.value)}
                        min={0}
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
    </Box>
  );
};

const FlexRow: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => {
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const defaultColor = useColorModeValue("gray.900", "gray.100");
  const valueColor = color ?? defaultColor;
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      fontSize="sm"
    >
      <Text color={labelColor}>{label}</Text>
      <Text fontWeight="semibold" color={valueColor}>
        {value}
      </Text>
    </Box>
  );
};

export default Home;
