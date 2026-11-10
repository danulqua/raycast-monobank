import { List } from "@raycast/api";
import { CashbackType, Transaction } from "../../types";
import { getTransactionAccessories } from "../../utils";
import { StatementActionsProps } from "./StatementActionsSection";
import TransactionActions from "./TransactionActions";
import TransactionDetail from "./TransactionDetail";

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
      accessories={!isShowingDetail ? getTransactionAccessories(transaction) : undefined}
      detail={<TransactionDetail transaction={transaction} cashbackType={cashbackType} />}
      actions={<TransactionActions transaction={transaction} statement={statement} />}
    />
  );
}
