"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0d0d0d] p-4">
      <div className="flex w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900">
        {/* Left panel — image */}
        <div className="relative hidden w-[44%] md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#1a1a1a] to-[#2a2a2a]" />
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 20%, #C7F56F 0%, transparent 50%), radial-gradient(circle at 70% 80%, #C7F56F 0%, transparent 40%)`,
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C7F56F]/70 mb-6">
                SequenceFlow
              </p>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Jouw volgende{" "}
                <span className="italic text-[#C7F56F]">beste lead</span>
                <br />
                staat hier.
              </h1>
              <p className="mt-4 text-base text-white/60 leading-relaxed">
                Automatisch gekwalificeerde leads uit Indeed. Gepersonaliseerde e-mails. Meer gesprekken.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Leads vandaag", value: "24" },
                { label: "Gekwalificeerd", value: "11" },
                { label: "Emails klaar", value: "8" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-xs text-white/50">{stat.label}</span>
                  <span className="text-sm font-bold text-[#C7F56F]">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="relative flex flex-1 flex-col justify-center px-10 py-12">
          {/* Logo */}
          <div className="absolute top-6 right-8">
            <Image
              src="/logo-zwart.png"
              alt="SequenceFlow"
              height={84}
              width={420}
              className="h-[84px] w-auto object-contain"
              priority
            />
          </div>

          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welkom terug
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Log in om uw leads te beheren.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                Er is iets misgegaan. Probeer opnieuw.
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              {/* Disabled email fields (coming soon) */}
              <div className="opacity-40 cursor-not-allowed">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  E-mailadres
                </label>
                <input
                  type="email"
                  disabled
                  placeholder="naam@bedrijf.nl"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <div className="opacity-40 cursor-not-allowed">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Wachtwoord
                </label>
                <input
                  type="password"
                  disabled
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <button
                disabled
                className="w-full rounded-xl bg-gray-900 dark:bg-gray-700 px-4 py-3 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
              >
                Inloggen (binnenkort)
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">Of</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Doorgaan met Google
            </button>

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
              Alleen toegankelijk voor SequenceFlow-medewerkers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 dark:bg-[#0d0d0d]" />}>
      <LoginContent />
    </Suspense>
  );
}
