"use client";

import { useState, useRef, useEffect } from "react";
import { Currency } from "@/generated/prisma/enums";
import { CURRENCIES, CURRENCY_INFO } from "@/app/investments/constants";

interface PortfolioCurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function PortfolioCurrencySelector({
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: PortfolioCurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (currency: Currency) => {
    if (currency !== value) {
      onChange(currency);
    }
    setIsOpen(false);
  };

  const currentCurrencyInfo = CURRENCY_INFO[value];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`flex items-center gap-1.5 px-2 py-1 text-sm border border-[#e5e5e5] hover:border-[#a3a3a3] transition-colors ${
          disabled || isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        title="Change display currency"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <svg
            className="w-3.5 h-3.5 animate-spin text-[#737373]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className="font-medium text-[#171717]">{currentCurrencyInfo?.symbol || value}</span>
        )}
        <span className="text-[#737373]">{value}</span>
        <svg
          className={`w-3.5 h-3.5 text-[#a3a3a3] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-white border border-[#e5e5e5] shadow-lg z-50 max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="Select display currency"
        >
          {CURRENCIES.map((currency) => {
            const info = CURRENCY_INFO[currency];
            const isSelected = currency === value;
            return (
              <button
                key={currency}
                onClick={() => handleSelect(currency)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-[#f5f5f5] text-[#171717]"
                    : "hover:bg-[#fafafa] text-[#737373] hover:text-[#171717]"
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 font-medium">{info?.symbol || ""}</span>
                  <span>{currency}</span>
                </span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-[#171717]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
