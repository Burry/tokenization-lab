import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { burnRequestSchema, BurnRequest, Account } from "~/lib/schemas";
import { useGlobalContext } from "~/context/Global";
import { useNotification } from "~/context/Notification";
import { trpc } from "~/utils/trpc";
import { Form } from "~/components/Form";
import { Input } from "~/components/Input";

const hiddenInputs = [
  "assetId",
  "apiKey",
  "account.address",
  "account.id",
  "contract.address",
  "contract.abi",
] as const;

const Burn = () => {
  const { assetId, assetExplorer, apiKey, account, contract, setAccount } =
    useGlobalContext();

  const { onOpen: onOpenNotification } = useNotification();

  const burnMutation = trpc.burn.useMutation({
    onMutate: ({ amount }) =>
      onOpenNotification({
        title: `Burning token "${contract?.name}"`,
        description: `Destroying ${amount} ${contract?.symbol} tokens in account "${account?.name}".`,
        icon: ArrowPathIcon,
      }),
    onSuccess: ({ hash, balances }, { amount }) => {
      onOpenNotification({
        title: `Burned token "${contract?.name}"`,
        description: `Destroyed ${amount} ${contract?.symbol} tokens in account "${account?.name}".`,
        icon: CheckCircleIcon,
        actions: [
          {
            key: "explorer",
            primary: true,
            children: "Open Explorer",
            href: `https://${assetExplorer}/tx/${hash}`,
            target: "_blank",
            rel: "noopener noreferrer",
            isLink: true,
          },
        ],
      });

      setAccount({
        ...(account as Account),
        balances,
      });
    },
    onError: (error) =>
      onOpenNotification({
        title: `Failed to burn token "${contract?.name}"`,
        description: error.message,
        icon: XCircleIcon,
      }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BurnRequest>({
    resolver: zodResolver(burnRequestSchema),
    defaultValues: {
      assetId,
      apiKey,
      account,
      contract,
      amount: 1000000,
    },
  });

  const onSubmit = (formData: BurnRequest) => burnMutation.mutate(formData);

  return (
    <Form
      title="Burn Token"
      description={`Destroy ${
        contract?.symbol ? ` ${contract.symbol}` : ""
      } tokens in your account.`}
      submitLabel="Burn"
      disabled={burnMutation.isLoading}
      onSubmit={handleSubmit(onSubmit)}
    >
      {hiddenInputs.map((key) => (
        <input key={key} type="hidden" {...register(key)} />
      ))}
      <Input
        className="col-span-2"
        label="Amount"
        error={errors.amount?.message}
        inputProps={{
          ...register("amount", {
            setValueAs: (v: any): number => Number(v) || 0,
          }),
          type: "number",
          placeholder: "1000000",
          min: 0,
          max: 2 ** 53,
        }}
      />
    </Form>
  );
};

export default Burn;
