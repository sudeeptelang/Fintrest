"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { LogoMark } from "@/components/layout/logo";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ink-0/95 backdrop-blur-xl border-b border-ink-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Fintrest home">
            <LogoMark size={32} className="transition-transform group-hover:scale-105" />
            <span className="font-[var(--font-heading)] text-xl font-bold tracking-tight text-ink-900">
              Fintrest<span className="text-ink-500 font-normal">.ai</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-ink-700 hover:text-ink-900 px-3 py-2 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-forest hover:bg-forest-dark text-ink-0 px-4 h-9 rounded-md text-sm font-semibold"
              )}
            >
              Start free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-ink-900"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-ink-200 bg-ink-0/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium text-ink-700 hover:text-ink-900 py-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-ink-200 flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-ink-700 hover:text-ink-900 py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-forest hover:bg-forest-dark text-ink-0 rounded-md h-10 text-sm font-semibold"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Start free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
