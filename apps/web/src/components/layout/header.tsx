"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import type { User } from "@watersys/db";

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: results } = trpc.customers.search.useQuery(
    { q: search },
    { enabled: search.length > 1 }
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-6">
      {/* Global search */}
      <div className="relative flex-1 max-w-lg" ref={searchRef}>
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search customers, jobs, tickets... (⌘K)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />

        {/* Search results dropdown */}
        {showResults && search.length > 1 && (results?.length ?? 0) > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100">
              Customers
            </div>
            {results?.map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  router.push(`/customers/${customer.id}`);
                  setSearch("");
                  setShowResults(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
              >
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {[customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .map((n) => n![0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </div>
                <div>
                  <div className="text-sm text-gray-900">
                    {[customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
                      customer.company}
                  </div>
                  <div className="text-xs text-gray-400">
                    {customer.phonePrimary} · {customer.type.toLowerCase()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 ml-auto">
        <a
          href="/schedule"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule
        </a>
        <a
          href="/tasks"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Tasks
        </a>

        {/* Quick add button */}
        <a
          href="/leads/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Quick Add
        </a>
      </div>
    </header>
  );
}
