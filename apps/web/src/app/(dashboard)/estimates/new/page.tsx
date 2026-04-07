"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

type LineItem = {
  itemType: "part" | "labor" | "flat_rate" | "addon" | "other";
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  isInFlatRate: boolean;
  sortOrder: number;
};

type EstimateOption = {
  optionType: "BEST" | "COST_EFFECTIVE";
  title: string;
  scope: string;
  isFlatRate: boolean;
  flatRateAmount: number;
  laborHours: number;
  laborRate: number;
  taxRate: number;
  notes: string;
  lineItems: LineItem[];
};

const defaultLineItem = (): LineItem => ({
  itemType: "part",
  description: "",
  quantity: 1,
  unitCost: 0,
  unitPrice: 0,
  isInFlatRate: false,
  sortOrder: 0,
});

const defaultOption = (optionType: "BEST" | "COST_EFFECTIVE"): EstimateOption => ({
  optionType,
  title: optionType === "BEST" ? "Best Solution" : "Cost Effective Solution",
  scope: "",
  isFlatRate: true,
  flatRateAmount: 0,
  laborHours: 0,
  laborRate: 0,
  taxRate: 0,
  notes: "",
  lineItems: [defaultLineItem()],
});

export default function NewEstimatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [notesToCustomer, setNotesToCustomer] = useState("");
  const [options, setOptions] = useState<EstimateOption[]>([
    defaultOption("BEST"),
    defaultOption("COST_EFFECTIVE"),
  ]);

  const { data: customers } = trpc.customers.list.useQuery({ limit: 200 });

  const createEstimate = trpc.estimates.create.useMutation({
    onSuccess: () => router.push("/estimates"),
    onError: (e) => setError(e.message),
  });

  const updateOption = (idx: number, field: keyof EstimateOption, value: unknown) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, [field]: value } : opt))
    );
  };

  const updateLineItem = (optIdx: number, liIdx: number, field: keyof LineItem, value: unknown) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? {
              ...opt,
              lineItems: opt.lineItems.map((li, j) =>
                j === liIdx ? { ...li, [field]: value } : li
              ),
            }
          : opt
      )
    );
  };

  const addLineItem = (optIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? { ...opt, lineItems: [...opt.lineItems, defaultLineItem()] }
          : opt
      )
    );
  };

  const removeLineItem = (optIdx: number, liIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? { ...opt, lineItems: opt.lineItems.filter((_, j) => j !== liIdx) }
          : opt
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    createEstimate.mutate({
      customerId,
      notesToCustomer: notesToCustomer || undefined,
      options: options.map((opt) => ({
        ...opt,
        flatRateAmount: opt.flatRateAmount || undefined,
        laborHours: opt.laborHours || undefined,
        laborRate: opt.laborRate || undefined,
        scope: opt.scope || undefined,
        notes: opt.notes || undefined,
        lineItems: opt.lineItems.map((li, idx) => ({ ...li, sortOrder: idx })),
      })),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Estimate</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Customer</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a customer...</option>
              {customers?.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes to Customer
            </label>
            <textarea
              value={notesToCustomer}
              onChange={(e) => setNotesToCustomer(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Options */}
        {options.map((opt, optIdx) => (
          <div key={opt.optionType} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">
              Option {optIdx + 1}: {opt.optionType === "BEST" ? "Best Solution" : "Cost Effective Solution"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={opt.title}
                  onChange={(e) => updateOption(optIdx, "title", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <textarea
                  value={opt.scope}
                  onChange={(e) => updateOption(optIdx, "scope", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  value={opt.taxRate}
                  onChange={(e) => updateOption(optIdx, "taxRate", Number(e.target.value) / 100)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id={`flatRate-${optIdx}`}
                  checked={opt.isFlatRate}
                  onChange={(e) => updateOption(optIdx, "isFlatRate", e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor={`flatRate-${optIdx}`} className="text-sm text-gray-700">
                  Flat Rate Pricing
                </label>
              </div>
              {opt.isFlatRate ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat Rate Amount ($)</label>
                  <input
                    type="number"
                    value={opt.flatRateAmount}
                    onChange={(e) => updateOption(optIdx, "flatRateAmount", Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Labor Hours</label>
                    <input
                      type="number"
                      value={opt.laborHours}
                      onChange={(e) => updateOption(optIdx, "laborHours", Number(e.target.value))}
                      min="0"
                      step="0.5"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Labor Rate ($/hr)</label>
                    <input
                      type="number"
                      value={opt.laborRate}
                      onChange={(e) => updateOption(optIdx, "laborRate", Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Line Items</h3>
              {opt.lineItems.map((li, liIdx) => (
                <div key={liIdx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input
                      placeholder="Description"
                      value={li.description}
                      onChange={(e) => updateLineItem(optIdx, liIdx, "description", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={li.itemType}
                      onChange={(e) => updateLineItem(optIdx, liIdx, "itemType", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="part">Part</option>
                      <option value="labor">Labor</option>
                      <option value="flat_rate">Flat Rate</option>
                      <option value="addon">Add-on</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={li.quantity}
                      onChange={(e) => updateLineItem(optIdx, liIdx, "quantity", Number(e.target.value))}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Cost $"
                      value={li.unitCost}
                      onChange={(e) => updateLineItem(optIdx, liIdx, "unitCost", Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Price $"
                      value={li.unitPrice}
                      onChange={(e) => updateLineItem(optIdx, liIdx, "unitPrice", Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLineItem(optIdx, liIdx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addLineItem(optIdx)}
                className="text-brand-600 hover:text-brand-700 text-sm font-medium"
              >
                + Add Line Item
              </button>
            </div>
          </div>
        ))}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createEstimate.isLoading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {createEstimate.isLoading ? "Creating..." : "Create Estimate"}
          </button>
        </div>
      </form>
    </div>
  );
}