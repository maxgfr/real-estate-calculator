import {
  Box,
  FormControl,
  FormLabel,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import Head from "next/head";
import React from "react";

type State = {
  housingPrice: number;
  notaryFees: number;
};

const Home: NextPage = () => {
  const [value, setValue] = React.useState<State | {}>({});

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
      <Text alignSelf={"center"} fontSize="6xl">
        Renta-immo
      </Text>
      <Box display="flex" flexDirection="column">
        <FormControl variant="floating" isRequired>
          <FormLabel>Prix du logement</FormLabel>
          <NumberInput
            step={1000}
            onChange={(_valueString, valueNumber) =>
              setValue({ ...value, housingPrice: valueNumber })
            }
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
              setValue({ ...value, notaryFees: valueNumber })
            }
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </Box>
    </Box>
  );
};

export default Home;
