"use client";

import Link from "next/link";
import { Briefcase, Building2, ArrowRight } from "lucide-react";

export default function SelectorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Pipeline kiezen
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kies welke scraper u wilt openen
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full max-w-xl">
        {/* Vacatures card */}
        <Link
          href="/vacatures"
          className="group flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:border-[#C7F56F] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C7F56F]/15">
              <Briefcase size={22} className="text-[#3a6600] dark:text-[#C7F56F]" />
            </div>
            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-[#C7F56F] transition-colors" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Vacatures</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Indeed leads — bedrijven die vacatures plaatsen
            </p>
          </div>
        </Link>

        {/* KVK card */}
        <Link
          href="/kvk"
          className="group flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:border-[#C7F56F] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Building2 size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-[#C7F56F] transition-colors" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">KVK</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Bedrijven — direct vanuit het KVK register
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
