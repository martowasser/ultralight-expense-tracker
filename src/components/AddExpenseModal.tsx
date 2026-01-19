"use client";

import { useState } from "react";
import {
  createExpense,
  AccountOption,
  CreditCardOption,
} from "@/app/dashboard/actions";
import { Currency, ExpenseCategory, PaymentMethod } from "@/app/dashboard/types";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "CREDIT_CARD", label: "credit card" },
  { value: "SERVICE", label: "service" },
  { value: "RENT", label: "rent" },
  { value: "INSURANCE", label: "insurance" },
  { value: "TAX", label: "tax" },
  { value: "SUBSCRIPTION", label: "subscription" },
  { value: "BUILDING_FEE", label: "building fee" },
  { value: "OTHER", label: "other" },
];

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "bank transfer" },
  { value: "DIRECT_DEBIT", label: "direct debit" },
  { value: "CASH", label: "cash" },
  { value: "CRYPTO_EXCHANGE", label: "crypto exchange" },
  { value: "CREDIT_CARD", label: "credit card" },
];

interface AddExpenseModalProps {
  currentMonth: string;
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({
  currentMonth,
  accounts,
  creditCards,
  onClose,
  onSuccess,
}: AddExpenseModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");

  // More options state
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentSourceId, setPaymentSourceId] = useState("");
  const [paidWithCardId, setPaidWithCardId] = useState("");

  // Credit Card category linked card
  const [linkedCreditCardId, setLinkedCreditCardId] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!name.trim()) {
      setError("name is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("amount must be a positive number");
      return;
    }

    const dueDayNum = parseInt(dueDay);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError("due day must be between 1 and 31");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createExpense({
        name: name.trim(),
        amount: amountNum,
        dueDay: dueDayNum,
        month: currentMonth,
        currency,
        category,
        paymentMethod: paymentMethod || null,
        paymentSourceId: paymentSourceId || null,
        paidWithCardId: paidWithCardId || null,
        linkedCreditCardId: linkedCreditCardId || null,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("failed to create expense");
      setIsSubmitting(false);
    }
  };

  // Clear card/account when payment method changes
  const handlePaymentMethodChange = (value: PaymentMethod | "") => {
    setPaymentMethod(value);
    // Clear selections when method changes
    if (value !== "CREDIT_CARD") {
      setPaidWithCardId("");
    }
    if (value === "CREDIT_CARD" || value === "") {
      setPaymentSourceId("");
    }
  };

  // Handle category change - clear linkedCreditCardId if not CREDIT_CARD
  const handleCategoryChange = (value: ExpenseCategory) => {
    setCategory(value);
    if (value !== "CREDIT_CARD") {
      setLinkedCreditCardId("");
    }
  };

  // Handle linked credit card selection - auto-fill name and dueDay
  const handleLinkedCardChange = (cardId: string) => {
    setLinkedCreditCardId(cardId);
    if (cardId) {
      const card = creditCards.find((c) => c.id === cardId);
      if (card) {
        // Auto-fill name with card name (user can still edit)
        setName(card.institutionName + " - " + card.name);
        // Auto-fill due day from card
        setDueDay(card.dueDay.toString());
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#fafafa] w-full sm:max-w-[400px] sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm text-[#171717]">add expense</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <p className="text-sm text-[#737373]">{error}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm text-[#737373]">
              name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="rent, netflix, electricity..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="amount" className="block text-sm text-[#737373]">
              amount
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="flex-1 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                placeholder="0.00"
                disabled={isSubmitting}
              />
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-24 px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="dueDay" className="block text-sm text-[#737373]">
              due day
            </label>
            <input
              type="number"
              id="dueDay"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              min="1"
              max="31"
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              placeholder="1-31"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="category" className="block text-sm text-[#737373]">
              category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
              disabled={isSubmitting}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Show card selector when category is Credit Card */}
          {category === "CREDIT_CARD" && (
            <div className="space-y-1">
              <label htmlFor="linkedCreditCardId" className="block text-sm text-[#737373]">
                credit card
              </label>
              <select
                id="linkedCreditCardId"
                value={linkedCreditCardId}
                onChange={(e) => handleLinkedCardChange(e.target.value)}
                className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="">select a card</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.institutionName} - {card.name}
                    {card.lastFourDigits && ` (****${card.lastFourDigits})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* More Options Collapsible Section */}
          <div className="border-t border-[#e5e5e5] pt-4">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center gap-2 text-sm text-[#737373] hover:text-[#171717]"
              disabled={isSubmitting}
            >
              <span className="text-xs">{showMoreOptions ? "▼" : "▶"}</span>
              more options
            </button>

            {showMoreOptions && (
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="paymentMethod" className="block text-sm text-[#737373]">
                    payment method
                  </label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod | "")}
                    className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <option value="">not specified</option>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show credit card selector when payment method is Credit Card */}
                {paymentMethod === "CREDIT_CARD" && (
                  <div className="space-y-1">
                    <label htmlFor="paidWithCardId" className="block text-sm text-[#737373]">
                      paid with card
                    </label>
                    <select
                      id="paidWithCardId"
                      value={paidWithCardId}
                      onChange={(e) => setPaidWithCardId(e.target.value)}
                      className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="">not specified</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.institutionName} - {card.name}
                          {card.lastFourDigits && ` (****${card.lastFourDigits})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Show account selector for other payment methods */}
                {paymentMethod && paymentMethod !== "CREDIT_CARD" && (
                  <div className="space-y-1">
                    <label htmlFor="paymentSourceId" className="block text-sm text-[#737373]">
                      payment source account
                    </label>
                    <select
                      id="paymentSourceId"
                      value={paymentSourceId}
                      onChange={(e) => setPaymentSourceId(e.target.value)}
                      className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="">not specified</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.institutionName} - {account.name} ({account.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#737373] border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] disabled:opacity-50 min-h-[44px]"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? "adding..." : "add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
