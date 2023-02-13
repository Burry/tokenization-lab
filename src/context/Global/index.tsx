import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/router";
import { Asset, AssetId, getAsset } from "~/lib/assets";
import {
  Account,
  Contract,
  assetIdSchema,
  apiKeySchema,
  accountSchema,
  contractSchema,
} from "~/lib/schemas";
import { Storage } from "./storage";

const assetIdStorage = new Storage("AssetId", assetIdSchema);
const apiKeyStorage = new Storage("ApiKey", apiKeySchema);
const accountStorage = new Storage("Account", accountSchema);
const contractStorage = new Storage("Contract", contractSchema);

interface IGlobalContext {
  assetId?: AssetId;
  assetName?: Asset["name"] | AssetId;
  apiKey?: string;
  account?: Account;
  contract?: Contract;
  setAssetId: (assetId: AssetId) => void;
  setApiKey: (apiKey: string | null) => void;
  setAccount: (account: Account | null) => void;
  setContract: (contract: Contract | null) => void;
  resetContext: VoidFunction;
}

const defaultValue: IGlobalContext = {
  assetId: undefined,
  assetName: undefined,
  apiKey: undefined,
  account: undefined,
  contract: undefined,
  setAssetId: () => undefined,
  setApiKey: () => undefined,
  setAccount: () => undefined,
  setContract: () => undefined,
  resetContext: () => undefined,
};

const Context = createContext(defaultValue);

type Props = {
  children: ReactNode;
};

export const GlobalContextProvider = ({ children }: Props) => {
  const [state, setState] = useState<IGlobalContext>(defaultValue);

  const router = useRouter();

  useEffect(() => {
    const storedApiKey = apiKeyStorage.get();

    setState((prev) => ({
      ...prev,
      assetId: assetIdStorage.get(),
      apiKey: storedApiKey,
      account: accountStorage.get(),
      contract: contractStorage.get(),
    }));

    if (!storedApiKey) {
      router.push("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStoredState = <T = any,>(
    storage: Storage<T>,
    key: keyof IGlobalContext,
    value: T
  ) => {
    storage.set(value);

    setState((prev) => ({
      ...prev,
      [key]: value === null ? undefined : value,
    }));
  };

  const setAssetId = (assetId: AssetId) =>
    setStoredState(assetIdStorage, "assetId", assetId);

  const setApiKey = (apiKey: string | null) =>
    setStoredState(apiKeyStorage, "apiKey", apiKey);

  const setAccount = (account: Account | null) =>
    setStoredState(accountStorage, "account", account);

  const setContract = (contract: Contract | null) =>
    setStoredState(contractStorage, "contract", contract);

  const resetContext = () => {
    assetIdStorage.delete();
    apiKeyStorage.delete();
    accountStorage.delete();
    contractStorage.delete();
    setState(defaultValue);
  };

  const assetName =
    (state.assetId && getAsset(state.assetId)?.name) || state.assetId;

  const value: IGlobalContext = {
    ...state,
    assetName,
    setAssetId,
    setApiKey,
    setAccount,
    setContract,
    resetContext,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useGlobalContext = () => useContext(Context);
