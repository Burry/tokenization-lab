import path from "path";
import fs from "fs";
import nodeModules from "node_modules-path";
import solc from "solc";
import { ContractFactory, Contract, InterfaceAbi } from "ethers";
import { DeployRequest } from "~/lib/schemas";
import { getContract } from "~/lib/contract";
import { getWeb3Provider } from "../helpers/web3";
import { getBalances } from "../helpers/getBalances";

/**
 * Get imported contract source code.
 *
 * @param relativePath path within node_modules
 * @returns file contents for solc
 */
export const findImports = (relativePath: string) => {
  const nodeModulesPath = nodeModules(relativePath);

  const absolutePath = path.resolve(nodeModulesPath, relativePath);

  const source = fs.readFileSync(absolutePath, "utf-8");

  return { contents: source };
};

/**
 * Compile and deploy an ERC-20 token contract, returning account balances.
 *
 * @param deployRequest deployment parameters
 * @returns native asset and token balances
 */
export const deploy = async ({
  name,
  symbol,
  premint,
  assetId,
  apiKey,
  account,
}: DeployRequest) => {
  const { provider, signer } = await getWeb3Provider({
    assetId,
    apiKey,
    account,
  });

  const { solidity, contractName } = getContract({ name, symbol, premint });

  const filename = `${contractName}.sol`;

  const solcInput = {
    language: "Solidity",
    sources: {
      [filename]: {
        content: solidity,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(solcInput), { import: findImports })
  );

  const tokenOutput = output.contracts[filename][contractName];

  const abi = tokenOutput.abi as InterfaceAbi;

  const bytecode = tokenOutput.evm.bytecode.object as string;

  const factory = new ContractFactory(abi, bytecode, signer);

  const contract = await factory.deploy();

  await contract.waitForDeployment();

  const contractAddress = contract.target;

  const _contract = new Contract(contractAddress as string, abi, signer);

  const balances = await getBalances(provider, _contract, signer.address);

  return {
    contractAddress,
    abi,
    balances,
  };
};
