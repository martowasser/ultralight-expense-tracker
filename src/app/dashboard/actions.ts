"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Currency, ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";

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
    currency: Currency;
    category: ExpenseCategory;
    paymentMethod: PaymentMethod | null;
    paymentSourceId: string | null;
    paidWithCardId: string | null;
    linkedCreditCardId: string | null;
  };
}

export interface CreateExpenseInput {
  name: string;
  amount: number;
  dueDay: number;
  month: string;
  currency: Currency;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod | null;
  paymentSourceId?: string | null;
  paidWithCardId?: string | null;
  linkedCreditCardId?: string | null;
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

  if (!input.currency || !["ARS", "USD"].includes(input.currency)) {
    return { success: false, error: "Currency must be ARS or USD" };
  }

  const validCategories = ["CREDIT_CARD", "SERVICE", "RENT", "INSURANCE", "TAX", "SUBSCRIPTION", "BUILDING_FEE", "OTHER"];
  if (!input.category || !validCategories.includes(input.category)) {
    return { success: false, error: "Invalid category" };
  }

  const validPaymentMethods = ["BANK_TRANSFER", "DIRECT_DEBIT", "CASH", "CRYPTO_EXCHANGE", "CREDIT_CARD"];
  if (input.paymentMethod && !validPaymentMethods.includes(input.paymentMethod)) {
    return { success: false, error: "Invalid payment method" };
  }

  try {
    // Validate paymentSourceId if provided
    if (input.paymentSourceId) {
      const account = await prisma.account.findUnique({
        where: { id: input.paymentSourceId },
      });
      if (!account || account.userId !== session.user.id) {
        return { success: false, error: "Payment source account not found" };
      }
    }

    // Validate paidWithCardId if provided
    if (input.paidWithCardId) {
      const card = await prisma.creditCard.findUnique({
        where: { id: input.paidWithCardId },
      });
      if (!card || card.userId !== session.user.id) {
        return { success: false, error: "Credit card not found" };
      }
    }

    // Validate linkedCreditCardId if provided
    if (input.linkedCreditCardId) {
      const linkedCard = await prisma.creditCard.findUnique({
        where: { id: input.linkedCreditCardId },
      });
      if (!linkedCard || linkedCard.userId !== session.user.id) {
        return { success: false, error: "Linked credit card not found" };
      }
    }

    // Create Expense and MonthlyExpense in a transaction
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: session.user!.id!,
          name: input.name.trim(),
          amount: input.amount,
          dueDay: input.dueDay,
          currency: input.currency,
          category: input.category,
          paymentMethod: input.paymentMethod || null,
          paymentSourceId: input.paymentSourceId || null,
          paidWithCardId: input.paidWithCardId || null,
          linkedCreditCardId: input.linkedCreditCardId || null,
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
  currency: Currency;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod | null;
  paymentSourceId?: string | null;
  paidWithCardId?: string | null;
  linkedCreditCardId?: string | null;
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

  if (!input.currency || !["ARS", "USD"].includes(input.currency)) {
    return { success: false, error: "Currency must be ARS or USD" };
  }

  const validCategories = ["CREDIT_CARD", "SERVICE", "RENT", "INSURANCE", "TAX", "SUBSCRIPTION", "BUILDING_FEE", "OTHER"];
  if (!input.category || !validCategories.includes(input.category)) {
    return { success: false, error: "Invalid category" };
  }

  const validPaymentMethods = ["BANK_TRANSFER", "DIRECT_DEBIT", "CASH", "CRYPTO_EXCHANGE", "CREDIT_CARD"];
  if (input.paymentMethod && !validPaymentMethods.includes(input.paymentMethod)) {
    return { success: false, error: "Invalid payment method" };
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

    // Validate paymentSourceId if provided
    if (input.paymentSourceId) {
      const account = await prisma.account.findUnique({
        where: { id: input.paymentSourceId },
      });
      if (!account || account.userId !== session.user.id) {
        return { success: false, error: "Payment source account not found" };
      }
    }

    // Validate paidWithCardId if provided
    if (input.paidWithCardId) {
      const card = await prisma.creditCard.findUnique({
        where: { id: input.paidWithCardId },
      });
      if (!card || card.userId !== session.user.id) {
        return { success: false, error: "Credit card not found" };
      }
    }

    // Validate linkedCreditCardId if provided
    if (input.linkedCreditCardId) {
      const linkedCard = await prisma.creditCard.findUnique({
        where: { id: input.linkedCreditCardId },
      });
      if (!linkedCard || linkedCard.userId !== session.user.id) {
        return { success: false, error: "Linked credit card not found" };
      }
    }

    // Update Expense and MonthlyExpense in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: input.expenseId },
        data: {
          name: input.name.trim(),
          amount: input.amount,
          dueDay: input.dueDay,
          currency: input.currency,
          category: input.category,
          paymentMethod: input.paymentMethod || null,
          paymentSourceId: input.paymentSourceId || null,
          paidWithCardId: input.paidWithCardId || null,
          linkedCreditCardId: input.linkedCreditCardId || null,
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
          currency: true,
          category: true,
          paymentMethod: true,
          paymentSourceId: true,
          paidWithCardId: true,
          linkedCreditCardId: true,
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
      currency: e.expense.currency,
      category: e.expense.category,
      paymentMethod: e.expense.paymentMethod,
      paymentSourceId: e.expense.paymentSourceId,
      paidWithCardId: e.expense.paidWithCardId,
      linkedCreditCardId: e.expense.linkedCreditCardId,
    },
  }));
}

export interface PreviousMonthExpense {
  expenseId: string;
  name: string;
  amount: string;
  dueDay: number;
  currency: Currency;
  category: ExpenseCategory;
}

export async function getPreviousMonthExpenses(currentMonth: string): Promise<PreviousMonthExpense[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  // Calculate previous month
  const [year, month] = currentMonth.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1); // month is 0-indexed, so subtract 2
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const expenses = await prisma.monthlyExpense.findMany({
    where: {
      userId: session.user.id,
      month: prevMonth,
    },
    include: {
      expense: {
        select: {
          id: true,
          name: true,
          dueDay: true,
          currency: true,
          category: true,
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
    expenseId: e.expenseId,
    name: e.expense.name,
    amount: e.amount.toString(),
    dueDay: e.expense.dueDay,
    currency: e.expense.currency,
    category: e.expense.category,
  }));
}

export interface CloneExpenseItem {
  expenseId: string;
  amount: number;
}

export interface CloneExpensesInput {
  targetMonth: string;
  expenses: CloneExpenseItem[];
}

export interface CloneExpensesResult {
  success: boolean;
  error?: string;
}

export async function cloneExpenses(input: CloneExpensesInput): Promise<CloneExpensesResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.targetMonth || !/^\d{4}-\d{2}$/.test(input.targetMonth)) {
    return { success: false, error: "Invalid month format" };
  }

  if (!input.expenses || input.expenses.length === 0) {
    return { success: false, error: "No expenses to clone" };
  }

  // Validate all amounts are positive
  for (const exp of input.expenses) {
    if (typeof exp.amount !== "number" || exp.amount <= 0) {
      return { success: false, error: "All amounts must be positive numbers" };
    }
  }

  try {
    // Verify ownership of all expenses
    const expenseIds = input.expenses.map((e) => e.expenseId);
    const ownedExpenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        userId: session.user.id,
      },
    });

    if (ownedExpenses.length !== expenseIds.length) {
      return { success: false, error: "Some expenses not found or not owned by user" };
    }

    // Create MonthlyExpense records for target month in a transaction
    await prisma.$transaction(async (tx) => {
      for (const exp of input.expenses) {
        // Check if MonthlyExpense already exists for this expense and month
        const existing = await tx.monthlyExpense.findUnique({
          where: {
            expenseId_month: {
              expenseId: exp.expenseId,
              month: input.targetMonth,
            },
          },
        });

        if (existing) {
          // Update existing record with new amount
          await tx.monthlyExpense.update({
            where: { id: existing.id },
            data: { amount: exp.amount },
          });
        } else {
          // Create new MonthlyExpense
          await tx.monthlyExpense.create({
            data: {
              userId: session.user!.id!,
              expenseId: exp.expenseId,
              month: input.targetMonth,
              amount: exp.amount,
              isPaid: false,
            },
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error cloning expenses:", error);
    return { success: false, error: "Failed to clone expenses" };
  }
}

export async function getExchangeRate(): Promise<number> {
  const session = await auth();

  if (!session?.user?.id) {
    return 1200; // Default rate
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  return settings?.usdToArsRate ? Number(settings.usdToArsRate) : 1200;
}

export interface AccountOption {
  id: string;
  name: string;
  currency: Currency;
  institutionName: string;
}

export async function getAccountsForSelect(): Promise<AccountOption[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: {
      institution: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { institution: { name: "asc" } },
      { name: "asc" },
    ],
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    institutionName: account.institution.name,
  }));
}

export interface CreditCardOption {
  id: string;
  name: string;
  lastFourDigits: string | null;
  institutionName: string;
  dueDay: number;
}

export async function getCreditCardsForSelect(): Promise<CreditCardOption[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    include: {
      institution: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { institution: { name: "asc" } },
      { name: "asc" },
    ],
  });

  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    lastFourDigits: card.lastFourDigits,
    institutionName: card.institution.name,
    dueDay: card.dueDay,
  }));
}
