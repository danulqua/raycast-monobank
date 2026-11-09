import { List } from "@raycast/api";
import { CashbackType, Transaction } from "../../types";
import { formatAmount, formatDateTime, getAmountColor, getCategory } from "../../utils";

const { Metadata } = List.Item.Detail;

export default function TransactionDetail(props: { transaction: Transaction; cashbackType?: CashbackType }) {
  const { transaction: t, cashbackType } = props;
  const isForeign = t.operationCurrency.code !== t.currency.code;
  const originalCategory = t.originalMcc !== t.mcc ? getCategory(t.originalMcc) : undefined;
  const cashback =
    cashbackType === CashbackType.MILES ? `${t.cashback.toFixed(2)} miles` : formatAmount(t.cashback, t.currency);

  return (
    <List.Item.Detail
      metadata={
        <Metadata>
          <Metadata.Label title="Description" text={t.description} />
          <Metadata.Label title="Time" text={formatDateTime(t.time)} />
          {/* A hold is already done for the user; only the merchant's bank hasn't settled it yet. */}
          <Metadata.Label title="Settlement" text={t.hold ? "On hold (amount may still change)" : "Settled"} />
          <Metadata.Separator />

          <Metadata.Label
            title="Amount"
            text={{
              value: formatAmount(t.amount, t.currency, { signed: true }),
              color: getAmountColor(t.amount),
            }}
          />
          {isForeign && (
            <Metadata.Label
              title="Operation Amount"
              text={formatAmount(t.operationAmount, t.operationCurrency, { signed: true })}
            />
          )}
          {t.commission !== 0 && <Metadata.Label title="Commission" text={formatAmount(t.commission, t.currency)} />}
          {t.cashback !== 0 && <Metadata.Label title="Cashback" text={cashback} />}
          <Metadata.Label title="Balance After" text={formatAmount(t.balance, t.currency)} />
          <Metadata.Separator />

          <Metadata.Label title="Category" icon={t.category.icon} text={t.category.name} />
          <Metadata.Label title="Group" text={t.category.groupName} />
          <Metadata.Label title="MCC" text={String(t.mcc)} />
          {originalCategory && (
            <Metadata.Label title="Original MCC" text={`${t.originalMcc} · ${originalCategory.name}`} />
          )}

          {t.comment && (
            <>
              <Metadata.Separator />
              <Metadata.Label title="Comment" text={t.comment} />
            </>
          )}

          {(t.counterName || t.counterIban || t.counterEdrpou) && <Metadata.Separator />}
          {t.counterName && <Metadata.Label title="Counterparty" text={t.counterName} />}
          {t.counterIban && <Metadata.Label title="Counterparty IBAN" text={t.counterIban} />}
          {t.counterEdrpou && <Metadata.Label title="Counterparty EDRPOU" text={t.counterEdrpou} />}

          <Metadata.Separator />
          {t.receiptId && <Metadata.Label title="Receipt Number" text={t.receiptId} />}
          {t.invoiceId && <Metadata.Label title="Invoice ID" text={t.invoiceId} />}
          <Metadata.Label title="Transaction ID" text={t.id} />
        </Metadata>
      }
    />
  );
}
