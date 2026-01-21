"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface HeaderProps {
  userEmail: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const navLinks = [
    { href: "/dashboard", label: "expenses" },
    { href: "/institutions", label: "institutions" },
    { href: "/credit-cards", label: "cards" },
    { href: "/investments", label: "investments" },
    { href: "/settings", label: "settings" },
  ];

  return (
    <header className="border-b border-[#e5e5e5] px-6 py-4">
      <div className="max-w-[640px] mx-auto flex items-center justify-between">
        <nav className="flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm lowercase min-h-[44px] flex items-center ${
                pathname === link.href
                  ? "text-[#171717]"
                  : "text-[#a3a3a3] hover:text-[#171717]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop navigation */}
        <div className="hidden sm:flex items-center gap-6">
          <span className="text-sm text-[#a3a3a3] truncate max-w-[200px]">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-[#737373] hover:text-[#171717] min-h-[44px]"
          >
            logout
          </button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#737373] hover:text-[#171717]"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="sm:hidden mt-4 pt-4 border-t border-[#e5e5e5]">
          <div className="max-w-[640px] mx-auto flex flex-col gap-4">
            <span className="text-sm text-[#a3a3a3] truncate">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="w-full py-3 text-sm text-[#737373] hover:text-[#171717] text-left min-h-[44px]"
            >
              logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
