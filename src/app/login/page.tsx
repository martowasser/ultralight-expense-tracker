"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("an error occurred. please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] space-y-8">
        <h1 className="text-xl font-normal text-[#171717] text-center lowercase">
          login
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-sm text-[#737373] text-center">{error}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm text-[#737373]">
              email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm text-[#737373]">
              password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-3 text-base text-[#171717] bg-white border border-[#e5e5e5] focus:border-[#171717] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-sm text-[#fafafa] bg-[#171717] hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isLoading ? "signing in..." : "sign in"}
          </button>
        </form>

        <p className="text-sm text-[#a3a3a3] text-center">
          don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#171717] hover:text-[#737373]">
            register
          </Link>
        </p>
      </div>
    </main>
  );
}
