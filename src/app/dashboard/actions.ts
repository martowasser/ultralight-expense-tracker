"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface MonthlyExpenseWithExpense {
  id: string;
  expenseId: string;
  month: string;
  amount: string;
  isPaid: boolean;
  expense: {
    id: string;
    name: string;
    dueDay: number;
  };
}

export async function getMonthlyExpenses(month: string): Promise<MonthlyExpenseWithExpense[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const expenses = await prisma.monthlyExpense.findMany({
    where: {
      userId: session.user.id,
      month: month,
    },
    include: {
      expense: {
        select: {
          id: true,
          name: true,
          dueDay: true,
        },
      },
    },
    orderBy: {
      expense: {
        dueDay: "asc",
      },
    },
  });

  return expenses.map((e) => ({
    id: e.id,
    expenseId: e.expenseId,
    month: e.month,
    amount: e.amount.toString(),
    isPaid: e.isPaid,
    expense: {
      id: e.expense.id,
      name: e.expense.name,
      dueDay: e.expense.dueDay,
    },
  }));
}
