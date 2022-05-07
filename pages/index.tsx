import {
  Box,
  FormControl,
  FormLabel,
  ListItem,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import Head from "next/head";
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import {
  getTotalFeesMortgage,
  getMonthlyMortgagePayment,
  getRevenuPerMonth,
  getTotalPrice,
  getTotalPriceMortgage,
  getProfitability,
} from "../utils";

const pattern = [
  {
    title: "Achat 🏠",
    value: [
      { key: "housingPrice", name: "Prix du logement", step: 1000 },
      { key: "notaryFees", name: "Frais notariaux", step: 1000 },
      { key: "houseWorks", name: "Travaux", step: 1000 },
    ],
  },
  {
    title: "Crédit 💳",
    value: [
      {
        key: "bankLoan",
        name: "Montant emprunté (avec assurance comprise)",
        step: 1000,
      },
      { key: "bankRate", name: "Taux", step: 0.1 },
      { key: "bankLoanPeriod", name: "Durée du prêt (en année)", step: 1 },
    ],
  },
  {
    title: "Location 💰",
    value: [
      { key: "rent", name: "Loyer annuelle (charges comprises)", step: 100 },
      {
        key: "rentalCharges",
        name: "Charges annuelle de copropriété",
        step: 100,
      },
      {
        key: "propertyTax",
        name: "Taxe foncière",
        step: 100,
      },
    ],
  },
] as const;

type Key = typeof pattern[number]["value"][number]["key"];

type State = {
  [key in Key]: string | number;
};

const Home: NextPage = () => {
  const router = useRouter();
  const [state, setState] = React.useState<State>({} as State);

  useEffect(() => {
    setState(router.query as unknown as State);
  }, [router.query]);

  const onChangeState = (key: string, value: string) => {
    setState({ ...state, [key]: value });
    router.replace(
      {
        query: { ...router.query, [key]: value },
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      maxWidth="1400px"
      marginX="auto"
      paddingX={"10vw"}
      paddingY={"2vw"}
    >
      <Head>
        <title>Rentabilité immobilière</title>
      </Head>
      <Text alignSelf={"center"} fontSize="6xl" fontWeight={"extrabold"}>
        Calcul de rentabilité immobilière
      </Text>
      {pattern.map(pattern => (
        <Box key={pattern.title} marginTop={"40px"}>
          <Text fontSize="3xl" fontWeight={"bold"}>
            {pattern.title}
          </Text>
          {pattern.value.map(({ key, name, step }) => (
            <Box key={key} marginTop={"15px"}>
              <FormControl variant="floating" isRequired>
                <FormLabel>{name}</FormLabel>
                <NumberInput
                  min={0}
                  step={step ?? 1000}
                  onChange={valueString => onChangeState(key, valueString)}
                  onBlur={e => {
                    e.preventDefault();
                  }}
                  value={state[key as keyof State]}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Box>
          ))}
        </Box>
      ))}

      <Text
        fontSize="3xl"
        fontWeight={"bold"}
        marginTop={"40px"}
        marginBottom={"10px"}
      >
        Résultat 🚀
      </Text>
      <UnorderedList marginBottom="10px">
        <ListItem>
          Coût total de l’investissement:{" "}
          {getTotalPrice(
            state.housingPrice,
            state.notaryFees,
            state.houseWorks
          )}
          {"€ "}
        </ListItem>
        <ListItem>
          Coût total du crédit:{" "}
          {getTotalPriceMortgage(
            state.bankLoan,
            getTotalFeesMortgage(
              state.bankLoan,
              state.bankLoanPeriod,
              getMonthlyMortgagePayment(
                state.bankLoan,
                state.bankRate,
                state.bankLoanPeriod
              )
            )
          )}
          {"€ "}
          (dont{" "}
          {getTotalFeesMortgage(
            state.bankLoan,
            state.bankLoanPeriod,
            getMonthlyMortgagePayment(
              state.bankLoan,
              state.bankRate,
              state.bankLoanPeriod
            )
          )}
          {"€ "}
          d&apos;intérêt)
        </ListItem>
        <ListItem>
          Mensualité du prêt :{" "}
          {getMonthlyMortgagePayment(
            state.bankLoan,
            state.bankRate,
            state.bankLoanPeriod
          )}
          {"€"}
        </ListItem>
        <ListItem>
          Revenu locatif mensuel brut :{" "}
          {getRevenuPerMonth(
            state.rent,
            state.rentalCharges,
            state.propertyTax
          )}
          {"€"}
        </ListItem>
        <ListItem>
          Rentabilité brut basé sur le crédit :{" "}
          {getProfitability(
            getRevenuPerMonth(
              state.rent,
              state.rentalCharges,
              state.propertyTax
            ),
            getTotalPriceMortgage(
              state.bankLoan,
              getTotalFeesMortgage(
                state.bankLoan,
                state.bankLoanPeriod,
                getMonthlyMortgagePayment(
                  state.bankLoan,
                  state.bankRate,
                  state.bankLoanPeriod
                )
              )
            )
          )}
          {"%"}
        </ListItem>
        <ListItem>
          Rentabilité brut basé sur le prix du bien :{" "}
          {getProfitability(
            getRevenuPerMonth(
              state.rent,
              state.rentalCharges,
              state.propertyTax
            ),
            getTotalPrice(
              state.housingPrice,
              state.notaryFees,
              state.houseWorks
            )
          )}
          {"%"}
        </ListItem>
      </UnorderedList>
    </Box>
  );
};

export default Home;
