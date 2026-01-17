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

export interface CreateExpenseInput {
  name: string;
  amount: number;
  dueDay: number;
  month: string;
}

export interface CreateExpenseResult {
  success: boolean;
  error?: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (typeof input.amount !== "number" || input.amount <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }

  if (typeof input.dueDay !== "number" || input.dueDay < 1 || input.dueDay > 31) {
    return { success: false, error: "Due day must be between 1 and 31" };
  }

  if (!input.month || !/^\d{4}-\d{2}$/.test(input.month)) {
    return { success: false, error: "Invalid month format" };
  }

  try {
    // Create Expense and MonthlyExpense in a transaction
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: session.user!.id!,
          name: input.name.trim(),
          amount: input.amount,
          dueDay: input.dueDay,
        },
      });

      await tx.monthlyExpense.create({
        data: {
          userId: session.user!.id!,
          expenseId: expense.id,
          month: input.month,
          amount: input.amount,
          isPaid: false,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Failed to create expense" };
  }
}

export interface UpdateExpenseInput {
  expenseId: string;
  monthlyExpenseId: string;
  name: string;
  amount: number;
  dueDay: number;
}

export interface UpdateExpenseResult {
  success: boolean;
  error?: string;
}

export async function updateExpense(input: UpdateExpenseInput): Promise<UpdateExpenseResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side validation
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (typeof input.amount !== "number" || input.amount <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }

  if (typeof input.dueDay !== "number" || input.dueDay < 1 || input.dueDay > 31) {
    return { success: false, error: "Due day must be between 1 and 31" };
  }

  try {
    // Verify ownership before updating
    const expense = await prisma.expense.findUnique({
      where: { id: input.expenseId },
    });

    if (!expense || expense.userId !== session.user.id) {
      return { success: false, error: "Expense not found" };
    }

    const monthlyExpense = await prisma.monthlyExpense.findUnique({
      where: { id: input.monthlyExpenseId },
    });

    if (!monthlyExpense || monthlyExpense.userId !== session.user.id) {
      return { success: false, error: "Monthly expense not found" };
    }

    // Update Expense and MonthlyExpense in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: input.expenseId },
        data: {
          name: input.name.trim(),
          amount: input.amount,
          dueDay: input.dueDay,
        },
      });

      await tx.monthlyExpense.update({
        where: { id: input.monthlyExpenseId },
        data: {
          amount: input.amount,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error: "Failed to update expense" };
  }
}

export interface TogglePaidInput {
  monthlyExpenseId: string;
  isPaid: boolean;
}

export interface TogglePaidResult {
  success: boolean;
  error?: string;
}

export async function togglePaid(input: TogglePaidInput): Promise<TogglePaidResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.monthlyExpenseId) {
    return { success: false, error: "Monthly expense ID is required" };
  }

  try {
    // Verify ownership before updating
    const monthlyExpense = await prisma.monthlyExpense.findUnique({
      where: { id: input.monthlyExpenseId },
    });

    if (!monthlyExpense || monthlyExpense.userId !== session.user.id) {
      return { success: false, error: "Monthly expense not found" };
    }

    // Update the isPaid status
    await prisma.monthlyExpense.update({
      where: { id: input.monthlyExpenseId },
      data: { isPaid: input.isPaid },
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling paid status:", error);
    return { success: false, error: "Failed to update paid status" };
  }
}

export interface DeleteExpenseInput {
  expenseId: string;
}

export interface DeleteExpenseResult {
  success: boolean;
  error?: string;
}

export async function deleteExpense(input: DeleteExpenseInput): Promise<DeleteExpenseResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.expenseId) {
    return { success: false, error: "Expense ID is required" };
  }

  try {
    // Verify ownership before deleting
    const expense = await prisma.expense.findUnique({
      where: { id: input.expenseId },
    });

    if (!expense || expense.userId !== session.user.id) {
      return { success: false, error: "Expense not found" };
    }

    // Delete the expense - MonthlyExpense records will be cascade deleted
    await prisma.expense.delete({
      where: { id: input.expenseId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
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
