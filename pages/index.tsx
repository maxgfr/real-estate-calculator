import {
  Box,
  FormControl,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import Head from "next/head";
import React, { useEffect } from "react";
import { useRouter } from "next/router";

type State = {
  housingPrice: number;
  notaryFees: number;
  houseWorks: number;
};

const Home: NextPage = () => {
  const router = useRouter();
  const [state, setState] = React.useState<State>({} as State);

  useEffect(() => {
    setState(router.query as unknown as State);
  }, [router.query]);

  const onChangeState = (key: string, value: number) => {
    const parseValue = isNaN(value) ? 0 : value;
    setState({ ...state, [key]: parseValue });
    router.replace({
      query: { ...router.query, [key]: parseValue },
    });
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      maxWidth="1400px"
      marginX="auto"
      paddingX={"10vw"}
    >
      <Head>
        <title>Renta Immo</title>
      </Head>
      <Text alignSelf={"center"} fontSize="6xl" marginBottom={"4"}>
        Renta-immo
      </Text>
      <Text fontSize="3xl" fontWeight={"bold"} marginBottom={"2"}>
        Achat
      </Text>
      <FormControl variant="floating" isRequired>
        <FormLabel>Prix du logement</FormLabel>
        <NumberInput
          step={1000}
          min={0}
          onChange={(_valueString, valueNumber) =>
            onChangeState("housingPrice", valueNumber)
          }
          value={state.housingPrice}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl variant="floating" isRequired marginTop={"20px"}>
        <FormLabel>Frais de notaire</FormLabel>
        <NumberInput
          step={500}
          onChange={(_valueString, valueNumber) =>
            onChangeState("notaryFees", valueNumber)
          }
          value={state.notaryFees}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl variant="floating" isRequired marginTop={"20px"}>
        <FormLabel>Travaux</FormLabel>
        <NumberInput
          step={500}
          onChange={(_valueString, valueNumber) =>
            onChangeState("houseWorks", valueNumber)
          }
          value={state.houseWorks}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </Box>
  );
};

export default Home;
