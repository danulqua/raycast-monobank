import { List } from "@raycast/api";
import { CashbackType, Transaction } from "../../types";
import { formatPlainAmount, getTransactionAccessories } from "../../utils";
import { StatementActionsProps } from "./StatementActionsSection";
import TransactionActions from "./TransactionActions";
import TransactionDetail from "./TransactionDetail";

/** Words to find a transaction by, besides its description: comment, counterparty, category in both languages, MCC and amount. */
function getKeywords(t: Transaction) {
  const texts = [
    t.comment,
    t.counterName,
    t.category.name,
    t.category.nameUk,
    t.category.groupName,
    t.category.groupNameUk,
  ].filter((text): text is string => !!text);

  const words = texts.flatMap((text) => text.split(/[\s.,;:/()«»"]+/));
  const amounts = [formatPlainAmount(Math.abs(t.amount), t.currency), String(Math.trunc(Math.abs(t.amount)))];

  return [...new Set([...texts, ...words, String(t.mcc), ...amounts].filter(Boolean))];
}

export default function TransactionListItem(props: {
  transaction: Transaction;
  cashbackType?: CashbackType;
  isShowingDetail: boolean;
  statement: StatementActionsProps;
}) {
  const { transaction, cashbackType, isShowingDetail, statement } = props;

  return (
    <List.Item
      id={transaction.id}
      icon={{ value: transaction.category.icon, tooltip: transaction.category.name }}
      title={transaction.description}
      subtitle={transaction.comment ?? transaction.counterName}
      keywords={getKeywords(transaction)}
      accessories={!isShowingDetail ? getTransactionAccessories(transaction) : undefined}
      detail={<TransactionDetail transaction={transaction} cashbackType={cashbackType} />}
      actions={<TransactionActions transaction={transaction} statement={statement} />}
    />
  );
}
