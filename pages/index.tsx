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
  getCapRate,
  getOnePercentRule,
  getOER,
  computeExitScenario,
  computeStressScenarios,
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
      { key: "exitYear", name: "Exit year (sale)", step: 1, placeholder: "e.g. 10", min: 1, max: 50 },
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
      { key: "monthlyCosts", name: "Monthly fixed costs (charges, insurance, maintenance...)", step: 50, placeholder: "e.g. 150", min: 0 },
      { key: "managementRate", name: "Management fees (% of rent)", step: 1, placeholder: "e.g. 8", min: 0, max: 100 },
      { key: "capexRate", name: "CapEx reserve (% of gross rent)", step: 1, placeholder: "e.g. 5", min: 0, max: 50 },
      { key: "vacancyRate", name: "Vacancy rate (%)", step: 1, placeholder: "e.g. 5", min: 0, max: 100 },
      { key: "rentIncreaseRate", name: "Annual rent increase (%)", step: 0.5, placeholder: "e.g. 1.5", min: -10, max: 20 },
      { key: "expenseInflationRate", name: "Annual expense inflation (%)", step: 0.5, placeholder: "e.g. 2", min: -5, max: 20 },
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
  managementRate: 0,
  vacancyRate: 5,
  appreciationRate: 0,
  rentIncreaseRate: 0,
  expenseInflationRate: 2,
  capexRate: 5,
  exitYear: 20,
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

  // Full-precision value for all calculations
  const monthlyMortgageExact = useMemo(
    () =>
      Number(getMonthlyMortgagePayment(state.bankLoan, state.bankRate, state.bankLoanPeriod, 10)),
    [state.bankLoan, state.bankRate, state.bankLoanPeriod]
  );

  // Rounded string for display only
  const monthlyMortgagePayment = useMemo(
    () => Math.round(monthlyMortgageExact).toFixed(0),
    [monthlyMortgageExact]
  );

  const totalMortgageInterest = useMemo(
    () =>
      getTotalMortgageInterest(
        state.bankLoan,
        state.bankLoanPeriod,
        state.bankRate
      ),
    [state.bankLoan, state.bankLoanPeriod, state.bankRate]
  );

  const totalMortgageCost = useMemo(
    () => getTotalMortgageCost(state.bankLoan, totalMortgageInterest),
    [state.bankLoan, totalMortgageInterest]
  );

  const netMonthlyIncome = useMemo(() => {
    const base = Number(
      getNetMonthlyIncomeDetailed(
        state.rent,
        state.monthlyCosts,
        state.propertyTax,
        "0",
        state.managementRate,
        "0",
        state.vacancyRate
      )
    );
    const capex = Number(state.rent) * Number(state.capexRate) / 100;
    const net = base - capex;
    return isNaN(net) ? "0" : net.toFixed(0);
  }, [state.rent, state.monthlyCosts, state.propertyTax, state.managementRate, state.vacancyRate, state.capexRate]);

  const grossYield = useMemo(
    () => getYield(Number(state.rent) * 12, totalPrice),
    [state.rent, totalPrice]
  );

  const netYield = useMemo(
    () => getYield(Number(netMonthlyIncome) * 12, totalPrice),
    [netMonthlyIncome, totalPrice]
  );

  const cashflow = useMemo(() => {
    const monthly = Number(netMonthlyIncome) - monthlyMortgageExact;
    return Number.isNaN(monthly) ? "0" : monthly.toFixed(0);
  }, [netMonthlyIncome, monthlyMortgageExact]);

  const totalOperationCost = useMemo(
    () => getTotalOperationCost(totalPrice, totalMortgageInterest),
    [totalPrice, totalMortgageInterest]
  );

  const cashOnCash = useMemo(
    () => getCashOnCash(Number(cashflow) * 12, downPayment),
    [cashflow, downPayment]
  );

  const breakEvenRent = useMemo(
    () => getBreakEvenRent(state.monthlyCosts, state.propertyTax, monthlyMortgageExact, state.vacancyRate, state.managementRate, state.capexRate),
    [state.monthlyCosts, state.propertyTax, monthlyMortgageExact, state.vacancyRate, state.managementRate, state.capexRate]
  );

  const ltv = useMemo(
    () => getLTV(state.bankLoan, state.housingPrice),
    [state.bankLoan, state.housingPrice]
  );

  const dscr = useMemo(
    () => getDSCR(netMonthlyIncome, monthlyMortgageExact),
    [netMonthlyIncome, monthlyMortgageExact]
  );

  const grm = useMemo(
    () => getGRM(state.housingPrice, Number(state.rent) * 12),
    [state.housingPrice, state.rent]
  );

  // NOI = Effective rent - operating expenses (before debt service and CapEx reserve)
  // CapEx is a capital reserve, not an operating expense — excluded from NOI per industry standard
  const noi = useMemo(() => {
    const effectiveRent = Number(state.rent) * (1 - Number(state.vacancyRate) / 100);
    const mgmtFees = effectiveRent * (Number(state.managementRate) / 100);
    const monthlyNOI = effectiveRent - mgmtFees - Number(state.monthlyCosts) - Number(state.propertyTax) / 12;
    return String(monthlyNOI * 12);
  }, [state.rent, state.vacancyRate, state.managementRate, state.monthlyCosts, state.propertyTax]);

  // Cap Rate = NOI / Property Value (purchase + renovation)
  const capRate = useMemo(
    () => getCapRate(noi, String(Number(state.housingPrice) + Number(state.houseWorks))),
    [noi, state.housingPrice, state.houseWorks]
  );

  // 1% Rule = Monthly rent / Purchase price
  const onePercentRule = useMemo(
    () => getOnePercentRule(state.rent, state.housingPrice),
    [state.rent, state.housingPrice]
  );

  // OER = Monthly operating expenses / Monthly gross effective income (excludes mortgage)
  const oer = useMemo(() => {
    const effectiveRent = Number(state.rent) * (1 - Number(state.vacancyRate) / 100);
    // netMonthlyIncome = effectiveRent - mgmt - capex - costs - tax/12 (no mortgage)
    // Operating expenses = effectiveRent - netMonthlyIncome
    const operatingExpenses = effectiveRent - Number(netMonthlyIncome);
    return getOER(String(Math.max(0, operatingExpenses)), String(effectiveRent));
  }, [state.rent, state.vacancyRate, netMonthlyIncome]);

  const projections = useMemo(() => {
    const period = Number(state.bankLoanPeriod);
    const appRate = Number(state.appreciationRate);
    const rentRate = Number(state.rentIncreaseRate);
    const rent = Number(state.rent);
    const costs = Number(state.monthlyCosts);
    const tax = Number(state.propertyTax);
    const vacancy = Number(state.vacancyRate);
    const dp = Number(downPayment);
    const base = Number(state.housingPrice) + Number(state.houseWorks);
    const inflRate = Number(state.expenseInflationRate);
    const mgmtRate = Number(state.managementRate);
    const capex = Number(state.capexRate);

    if (period <= 0 || isNaN(base)) return null;

    // Property value at loan end (with appreciation)
    const propertyValue = Math.round(base * Math.pow(1 + appRate / 100, period));

    // Projected monthly rent at loan end
    const rentAtEnd = Math.round(rent * Math.pow(1 + rentRate / 100, period));

    // Monthly cashflow AFTER loan (no more mortgage, rent has grown)
    const effectiveRentAfter = rentAtEnd * (1 - vacancy / 100);
    const mgmtFees = effectiveRentAfter * (mgmtRate / 100);
    const capexAfter = rentAtEnd * (capex / 100);
    const inflatedCosts = costs * Math.pow(1 + inflRate / 100, period);
    const inflatedTax = tax * Math.pow(1 + inflRate / 100, period);
    const cashflowAfterLoan = Math.round(effectiveRentAfter - mgmtFees - capexAfter - inflatedCosts - inflatedTax / 12);

    // Cumulative cashflow over extended horizon (beyond loan to find breakeven)
    const horizon = Math.min(period + 10, 40);
    let cumulativeCF = -dp;
    let breakevenYear: number | null = null;

    for (let y = 1; y <= horizon; y++) {
      const r = rent * Math.pow(1 + rentRate / 100, y - 1);
      const eff = r * (1 - vacancy / 100);
      const mgmt = eff * (mgmtRate / 100);
      const cx = r * (capex / 100);
      const ic = costs * Math.pow(1 + inflRate / 100, y - 1);
      const it = tax * Math.pow(1 + inflRate / 100, y - 1);
      const net = eff - mgmt - cx - ic - it / 12;
      const mortgage = y <= period ? monthlyMortgageExact : 0;
      const prevCF = cumulativeCF;
      cumulativeCF += (net - mortgage) * 12;
      if (prevCF < 0 && cumulativeCF >= 0 && breakevenYear === null) {
        breakevenYear = y;
      }
    }

    // Cumulative cashflow at loan end specifically
    let cumulativeCFAtLoanEnd = -dp;
    for (let y = 1; y <= period; y++) {
      const r = rent * Math.pow(1 + rentRate / 100, y - 1);
      const eff = r * (1 - vacancy / 100);
      const mgmt = eff * (mgmtRate / 100);
      const cx = r * (capex / 100);
      const ic = costs * Math.pow(1 + inflRate / 100, y - 1);
      const it = tax * Math.pow(1 + inflRate / 100, y - 1);
      const net = eff - mgmt - cx - ic - it / 12;
      cumulativeCFAtLoanEnd += (net - monthlyMortgageExact) * 12;
    }

    // Total return = equity (property value, loan repaid) + cumulative cashflow at loan end
    const totalReturn = Math.round(propertyValue + cumulativeCFAtLoanEnd);

    return {
      propertyValue,
      rentAtEnd,
      cashflowAfterLoan,
      cumulativeCashflow: Math.round(cumulativeCFAtLoanEnd),
      totalReturn,
      breakevenYear,
      hasAppreciation: appRate !== 0,
      hasRentIncrease: rentRate !== 0,
      period,
    };
  }, [state.bankLoanPeriod, state.appreciationRate, state.rentIncreaseRate, state.rent, state.monthlyCosts, state.propertyTax, state.vacancyRate, state.expenseInflationRate, state.managementRate, state.capexRate, monthlyMortgageExact, downPayment, state.housingPrice, state.houseWorks]);

  const exitScenario = useMemo(() => {
    return computeExitScenario(
      Number(state.exitYear), Number(state.housingPrice), Number(state.houseWorks),
      Number(state.appreciationRate), Number(state.bankLoan), Number(state.bankRate),
      Number(state.bankLoanPeriod), monthlyMortgageExact, Number(downPayment),
      Number(state.rent), Number(state.monthlyCosts), Number(state.propertyTax),
      Number(state.vacancyRate), Number(state.managementRate), Number(state.rentIncreaseRate),
      Number(state.expenseInflationRate), Number(state.capexRate)
    );
  }, [state.exitYear, state.housingPrice, state.houseWorks, state.appreciationRate, state.bankLoan, state.bankRate, state.bankLoanPeriod, monthlyMortgageExact, downPayment, state.rent, state.monthlyCosts, state.propertyTax, state.vacancyRate, state.managementRate, state.rentIncreaseRate, state.expenseInflationRate, state.capexRate]);

  const stressScenarios = useMemo(() => {
    const base = Number(state.housingPrice) + Number(state.houseWorks);
    return computeStressScenarios(
      Number(state.rent), Number(state.monthlyCosts), Number(state.propertyTax),
      Number(state.vacancyRate), monthlyMortgageExact, Number(state.rentIncreaseRate),
      Number(state.bankLoanPeriod), Number(state.expenseInflationRate), Number(state.managementRate),
      Number(state.capexRate), Number(downPayment), base, Number(state.appreciationRate)
    );
  }, [state.rent, state.monthlyCosts, state.propertyTax, state.vacancyRate, monthlyMortgageExact, state.rentIncreaseRate, state.bankLoanPeriod, state.expenseInflationRate, state.managementRate, state.capexRate, downPayment, state.housingPrice, state.houseWorks, state.appreciationRate]);

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
      ["Monthly fixed costs (charges, insurance, maintenance)", stripCurrency(String(state.monthlyCosts)), stripCurrency(String(state.monthlyCosts)) * 12],
      ["Management fees (% of rent)", `${Number(state.managementRate)} %`, ""],
      ["Property tax", stripCurrency(String(state.propertyTax)) / 12, stripCurrency(String(state.propertyTax))],
      ["Expense inflation rate", `${Number(state.expenseInflationRate)} %`, "Annual"],
      ["CapEx reserve (% of gross rent)", `${Number(state.capexRate)} %`, ""],
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
      ["Cash-on-cash return", cashOnCash === 'N/A' ? 'N/A' : stripPercent(cashOnCash) / 100, "Format: decimal"],
      ["DSCR", dscr === '∞' ? '∞' : Number(dscr), "Debt Service Coverage Ratio"],
      ["GRM", Number(grm), "Gross Rent Multiplier"],
      ["Appreciation rate", `${Number(state.appreciationRate)} %`, "Annual (property value)"],
      ["Rent increase rate", `${Number(state.rentIncreaseRate)} %`, "Annual"],
      ["Expense inflation rate", `${Number(state.expenseInflationRate)} %`, "Annual (costs + tax)"],
      ["Management fees", `${Number(state.managementRate)} %`, "Of effective rent"],
      ["CapEx reserve", `${Number(state.capexRate)} %`, "Of gross rent"],
      ["Cap Rate", capRate === '0' ? 'N/A' : `${capRate} %`, "NOI / Property value"],
      ["1% Rule", `${onePercentRule} %`, "Monthly rent / Purchase price"],
      ["OER", `${oer} %`, "Operating expenses / Income"],
      ["", "", ""],
      ["--- Projections ---", "", `At year ${projections?.period ?? Number(state.bankLoanPeriod)}`],
      ["Property value at loan end", projections?.propertyValue ?? 0, "Including appreciation"],
      ["Monthly rent at loan end", projections?.rentAtEnd ?? 0, "Including rent increases"],
      ["Cashflow after loan (monthly)", projections?.cashflowAfterLoan ?? 0, "Passive income, no mortgage"],
      ["Cumulative cashflow", projections?.cumulativeCashflow ?? 0, "Over full loan period"],
      ["Total return", projections?.totalReturn ?? 0, "Equity + cumulative cashflow"],
      ["Breakeven year", projections?.breakevenYear ?? "N/A", "Year cumulative cashflow turns positive"],
      ["", "", ""],
      ["--- Exit scenario ---", "", `At year ${state.exitYear}`],
      ["Sale price", exitScenario?.salePrice ?? 0, "With appreciation"],
      ["Capital gain", exitScenario?.capitalGain ?? 0, "Sale price - purchase - renovation"],
      ["Remaining balance", exitScenario?.remainingBalance ?? 0, "Outstanding loan"],
      ["Total profit", exitScenario?.totalProfit ?? 0, "Cashflow + sale - balance"],
      ["ROI", exitScenario?.roi ?? "N/A", ""],
      ["Annualized ROI", exitScenario?.annualizedRoi ?? "N/A", ""],
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

            {/* At-a-glance summary */}
            <Grid templateColumns="1fr 1fr" gap={3}>
              <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center">
                <Text fontSize="xs" color={textLabel} fontWeight="bold">CASHFLOW</Text>
                <Text fontSize="lg" fontWeight="bold" color={Number(cashflow) >= 0 ? textCashflowPositive : textCashflowNegative}>
                  {formatCurrency(cashflow)}<Text as="span" fontSize="xs" color={textLabel}>/mo</Text>
                </Text>
              </Box>
              <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center">
                <Text fontSize="xs" color={textLabel} fontWeight="bold">CASH-ON-CASH</Text>
                <Text fontSize="lg" fontWeight="bold" color={cashOnCash === 'N/A' ? textLabel : Number(cashOnCash) >= 0 ? textCashflowPositive : textCashflowNegative}>
                  {cashOnCash === 'N/A' ? 'N/A' : `${Number(cashOnCash).toFixed(1)}%`}
                </Text>
              </Box>
              <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center">
                <Text fontSize="xs" color={textLabel} fontWeight="bold">DSCR</Text>
                <Text fontSize="lg" fontWeight="bold" color={dscr === '∞' ? textRendementBon : Number(dscr) >= 1.25 ? textRendementBon : Number(dscr) >= 1 ? textLabel : textCashflowNegative}>
                  {dscr}
                </Text>
              </Box>
              <Box p={3} bg={bgRecap} borderRadius="lg" borderWidth="1px" borderColor={borderInput} textAlign="center">
                <Text fontSize="xs" color={textLabel} fontWeight="bold">BREAKEVEN</Text>
                <Text fontSize="lg" fontWeight="bold" color={projections?.breakevenYear !== null ? textCashflowPositive : textCashflowNegative}>
                  {projections?.breakevenYear !== null ? `Y${projections?.breakevenYear}` : "N/A"}
                </Text>
              </Box>
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
                  value={formatCurrency(String(Number(cashflow) * 12))}
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
                  tooltip="(Annual cashflow / Down payment) × 100. The actual return on the cash you invested. N/A if 100% financed (no down payment). Target: >8% excellent, 4-8% good."
                />
                <FlexRow
                  label="DSCR"
                  value={dscr}
                  color={dscr === '∞' ? textRendementBon : Number(dscr) >= 1.25 ? textRendementBon : Number(dscr) >= 1 ? undefined : textCashflowNegative}
                  tooltip="Debt Service Coverage Ratio = Net income / Mortgage payment. ≥ 1.5 excellent, ≥ 1.25 good (standard lender minimum), ≥ 1.0 covers debt (tight), < 1.0 deficit. ∞ if no mortgage (cash purchase)."
                />
                <FlexRow
                  label="GRM"
                  value={grm}
                  color={Number(grm) <= 15 ? textRendementBon : Number(grm) <= 20 ? textRendementFaible : textCashflowNegative}
                  tooltip="Gross Rent Multiplier = Purchase price / Annual gross rent. Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive. Only meaningful for comparing properties within the same market."
                />
                <FlexRow
                  label="Cap Rate"
                  value={formatPercent(capRate)}
                  color={Number(capRate) >= 6 ? textRendementBon : Number(capRate) >= 4 ? textRendementFaible : textCashflowNegative}
                  tooltip="Capitalization Rate = NOI / Property Value × 100. NOI = effective rent − management fees − fixed costs − property tax (before debt service and CapEx). Industry standard for comparing properties regardless of financing. ≥ 6% good, 4-6% average, < 4% low."
                />
                <FlexRow
                  label="1% Rule"
                  value={`${onePercentRule} %`}
                  color={Number(onePercentRule) >= 1 ? textRendementBon : Number(onePercentRule) >= 0.7 ? textRendementFaible : textCashflowNegative}
                  tooltip="Monthly rent / Purchase price × 100. Quick heuristic: ≥ 1% generally indicates a good cash-flowing deal. ≥ 0.7% acceptable in appreciating markets."
                />
                <FlexRow
                  label="OER"
                  value={`${oer} %`}
                  color={Number(oer) <= 40 ? textRendementBon : Number(oer) <= 60 ? textRendementFaible : textCashflowNegative}
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
                  {section.fields.map(({ key, name, step, placeholder, min, max }) => (
                    <FormControl key={key}>
                      <FormLabel fontSize="sm" color={textLabel} mb={1}>
                        {name}
                      </FormLabel>
                      <Input
                        type="number"
                        value={state[key]}
                        onChange={(e) => onChangeState(key, e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
        managementRate={Number(state.managementRate)}
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
    note: "Target: > 8% excellent, 4-8% good. N/A if 100% financed (no down payment).",
  },
  {
    title: "DSCR (Debt Service Coverage Ratio)",
    formula: "DSCR = Net monthly income / Monthly mortgage payment",
    note: ">= 1.5 = excellent, >= 1.25 = good (standard lender minimum), >= 1.0 = covers debt (tight), < 1.0 = deficit. N/A if no mortgage.",
  },
  {
    title: "GRM (Gross Rent Multiplier)",
    formula: "GRM = Purchase price / (Monthly rent x 12)",
    note: "Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive.",
  },
  {
    title: "Equity Build-Up",
    formula: "Equity (principal paid) = Property base value - Remaining balance\nEquity (appreciation) = Base value x (1 + Rate)^Y - Base value\nTotal equity = Equity (principal paid) + Equity (appreciation)",
    note: "Property base value = Purchase price + Renovation budget. Equity (principal paid) includes down payment + cumulative loan repayment. Appreciation applies to property value only, not rent.",
  },
  {
    title: "Cumulative Cashflow Projection",
    formula: "Year 0: -Down payment\nYear Y: Previous + Annual cashflow (yr Y)\nAnnual cashflow (yr Y) = Effective rent - Management fees - Inflated costs - Inflated tax / 12 - Mortgage",
    note: "Rent increases annually. Costs and property tax are inflated by the expense inflation rate. Management fees scale with rent. Property appreciation is not included here — see Equity Build-Up for that.",
  },
  {
    title: "Amortization (per month)",
    formula: "Interest = Remaining balance x Monthly rate\nPrincipal = Monthly payment - Interest\nNew balance = Remaining balance - Principal",
  },
  {
    title: "Cashflow After Loan",
    formula: "Rent at year N = Monthly rent x (1 + Rent increase / 100)^N\nEffective rent = Rent at year N x (1 - Vacancy / 100)\nCashflow after loan = Effective rent - Management fees - Inflated costs - Inflated tax / 12",
    note: "Monthly passive income once the loan is fully repaid. Costs and tax are inflated to year N. Management fees scale with projected rent.",
  },
  {
    title: "Annual Cashflow",
    formula: "Annual cashflow (yr Y) = (Net income at yr Y - Mortgage) x 12\nNet income = Effective rent - Management fees - Inflated costs - Inflated tax / 12\nMortgage = Monthly payment if Y <= Loan term, else 0",
    note: "Same logic as cumulative cashflow, but shows each year individually. Expenses grow with inflation rate. Green = profit, red = loss.",
  },
  {
    title: "Income vs Expenses",
    formula: "Annual income = Effective rent x 12\nAnnual expenses = Mortgage x 12 + (Inflated costs + Management fees) x 12 + Inflated tax",
    note: "Expenses grow with the inflation rate. Management fees scale with rent. After the loan ends, expenses drop sharply.",
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
    formula: "For each rate variation (-1% to +2%):\nMonthly payment = P x [t(1+t)^n] / [(1+t)^n - 1]\nCashflow = Net income - Monthly payment\nDSCR = Net income / Monthly payment",
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
