"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Moon, Sun, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/emails", label: "E-mails" },
  { href: "/bounces", label: "Bounces" },
  { href: "/settings", label: "Instellingen" },
];

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [firstName, setFirstName] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email || "";
        setFirstName(name.split(" ")[0]);
      }
    });
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <a
          href="https://getsequenceflow.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 flex-shrink-0"
        >
          <Image
            src={isDark ? "/logo-wit.png" : "/logo-zwart.png"}
            alt="SequenceFlow"
            height={96}
            width={480}
            className="h-24 w-auto object-contain"
            priority
          />
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#C7F56F] text-[#1a1a1a]"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
            <span className="hidden sm:inline">{isDark ? "Licht" : "Donker"}</span>
          </button>

          {firstName && (
            <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 px-1">
              Hoi, {firstName}
            </span>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Uitloggen</span>
          </button>
        </div>
      </div>
    </header>
  );
}
