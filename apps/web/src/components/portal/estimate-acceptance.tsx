"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isInFlatRate: boolean;
}

interface OptionData {
  id: string;
  optionType: string;
  title: string;
  scope: string | null;
  isFlatRate: boolean;
  flatRateAmount: number | null;
  laborHours: number | null;
  laborRate: number | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  lineItems: LineItem[];
}

interface Props {
  estimateId: string;
  portalToken: string;
  options: OptionData[];
  dropboxSignRequestId: string | null;
  expiresAt: Date | null;
}

export function PortalEstimateAcceptance({
  estimateId,
  portalToken,
  options,
  dropboxSignRequestId,
}: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "sign" | "done">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bestOption = options.find((o) => o.optionType === "BEST");
  const budgetOption = options.find((o) => o.optionType === "COST_EFFECTIVE");

  const selectedOption = options.find((o) => o.id === selectedOptionId);

  async function handleChooseOption(optionId: string) {
    setSelectedOptionId(optionId);
    setStep("sign");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function handleInitiateSign() {
    if (!selectedOptionId) return;
    setLoading(true);
    setError(null);

    try {
      // Create embedded sign URL via our API
      const res = await fetch("/api/portal/initiate-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId, portalToken, optionId: selectedOptionId }),
      });

      if (!res.ok) throw new Error("Failed to initiate signing");

      const { signUrl } = await res.json() as { signUrl: string };

      // Load Dropbox Sign embedded client
      const { default: HelloSign } = await import("hellosign-embedded");
      const client = new HelloSign();
      client.open(signUrl, {
        clientId: process.env.NEXT_PUBLIC_HELLOSIGN_CLIENT_ID ?? "",
        skipDomainVerification: process.env.NODE_ENV !== "production",
      });

      client.on("sign", () => {
        setStep("done");
        client.close();
      });

      client.on("error", (data: unknown) => {
        console.error("HelloSign error:", data);
        setError("Signing failed. Please try again or contact us.");
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please contact us directly.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Estimate Accepted!</h2>
        <p className="text-gray-600">
          Thank you! You&apos;ve accepted the{" "}
          <strong>{selectedOption?.title}</strong> option. Our team will contact you shortly to
          schedule your installation.
        </p>
        <p className="text-sm text-gray-400 mt-4">A signed copy has been emailed to you.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Options</h2>

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[bestOption, budgetOption].filter(Boolean).map((option) => {
          if (!option) return null;
          const isBest = option.optionType === "BEST";
          const isSelected = selectedOptionId === option.id;

          return (
            <div
              key={option.id}
              className={`relative bg-white rounded-xl border-2 p-5 transition cursor-pointer ${
                isSelected
                  ? "border-brand-500 ring-2 ring-brand-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => step === "choose" && setSelectedOptionId(option.id)}
            >
              {isBest && (
                <div className="absolute -top-3 left-4">
                  <span className="bg-brand-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    ⭐ Recommended
                  </span>
                </div>
              )}

              <div className="mt-2">
                <h3 className="font-semibold text-gray-900">{option.title}</h3>
                {!isBest && (
                  <span className="text-xs text-gray-400">Budget-friendly option</span>
                )}
              </div>

              {option.scope && (
                <p className="text-sm text-gray-600 mt-2">{option.scope}</p>
              )}

              {/* Line items (non-flat-rate) */}
              {option.lineItems.filter((li) => !li.isInFlatRate).length > 0 && (
                <div className="mt-3 space-y-1">
                  {option.lineItems
                    .filter((li) => !li.isInFlatRate)
                    .map((li) => (
                      <div key={li.id} className="flex justify-between text-sm text-gray-600">
                        <span>{li.description}</span>
                        <span>{formatCurrency(li.total)}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Labor */}
              {option.isFlatRate && option.flatRateAmount ? (
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Installation (flat rate)</span>
                  <span>{formatCurrency(option.flatRateAmount)}</span>
                </div>
              ) : option.laborHours && option.laborRate ? (
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Labor ({option.laborHours}h)</span>
                  <span>{formatCurrency(option.laborHours * option.laborRate)}</span>
                </div>
              ) : null}

              {option.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Tax</span>
                  <span>{formatCurrency(option.taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-gray-900 mt-3 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-xl">{formatCurrency(option.total)}</span>
              </div>

              {option.notes && (
                <p className="text-xs text-gray-400 mt-2">{option.notes}</p>
              )}

              {isSelected && (
                <div className="mt-3 flex items-center gap-1.5 text-brand-600 text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              )}

              {step === "choose" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChooseOption(option.id);
                  }}
                  className={`w-full mt-4 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                    isBest
                      ? "bg-brand-600 hover:bg-brand-700 text-white"
                      : "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700"
                  }`}
                >
                  Choose This Option
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* E-sign panel */}
      {step === "sign" && selectedOption && (
        <div className="bg-white rounded-xl border-2 border-brand-300 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">
            Accept & Sign — {selectedOption.title}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Total: <strong>{formatCurrency(selectedOption.total)}</strong>
            {" · "}
            By signing, you authorize Water Systems to proceed with the scope above at the stated price.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("choose")}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              ← Change Option
            </button>
            <button
              onClick={handleInitiateSign}
              disabled={loading}
              className="flex-1 py-2.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm transition disabled:opacity-60"
            >
              {loading ? "Opening signature..." : "✍ Sign to Accept"}
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Powered by Dropbox Sign · Legally binding e-signature under the ESIGN Act · Timestamped audit trail
          </p>
        </div>
      )}
    </section>
  );
}
