import { useCallback, useEffect, useState } from "react";
import { BudgetInput, deleteBudget, moveBudget, readBudgets, upsertBudget } from "../services/budgets";
import { Budget, MoveDirection } from "../types";

/**
 * Every `useBudgets` in the command reloads after any of them writes, so the statement summary underneath an
 * open "Manage Budgets" view is up to date when the user goes back.
 */
const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach((listener) => listener());
}

/** The saved budgets. Writes go through storage (see `upsertBudget`), then every `useBudgets` reads it again. */
export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    function load() {
      readBudgets()
        .then((budgets) => {
          if (!isCancelled) setBudgets(budgets);
        })
        .catch(console.error)
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    }

    load();
    listeners.add(load);
    return () => {
      isCancelled = true;
      listeners.delete(load);
    };
  }, []);

  const save = useCallback(async (input: BudgetInput) => {
    const budget = await upsertBudget(input);
    notifyChange();
    return budget;
  }, []);

  const remove = useCallback(async (budget: Budget) => {
    await deleteBudget(budget.id);
    notifyChange();
  }, []);

  const move = useCallback(async (budget: Budget, direction: MoveDirection) => {
    await moveBudget(budget.id, direction);
    notifyChange();
  }, []);

  return { budgets, isLoading, save, remove, move };
}
