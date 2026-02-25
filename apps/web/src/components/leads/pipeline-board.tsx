"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PIPELINE_STAGES } from "@watersys/shared";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  stage: string;
  priority: string;
  estimatedValue: unknown;
  stageUpdatedAt: Date;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    type: string;
    phonePrimary: string | null;
  };
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
  site: { id: string; address: string; city: string; state: string } | null;
  _count: { estimates: number; interactions: number };
};

export function PipelineBoard({
  leads,
  onUpdate,
}: {
  leads: Lead[];
  onUpdate: () => void;
}) {
  const updateStage = trpc.leads.updateStage.useMutation({
    onSuccess: onUpdate,
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const leadsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = leads.filter((l) => l.stage === stage.key);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    setOverStage(stageKey);
  }

  function handleDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    if (draggingId && draggingId !== stageKey) {
      updateStage.mutate({ id: draggingId, stage: stageKey as Lead["stage"] });
    }
    setDraggingId(null);
    setOverStage(null);
  }

  // Show only pipeline stages (not billed for kanban)
  const visibleStages = PIPELINE_STAGES.slice(0, 7);

  return (
    <div className="kanban-board pb-4">
      {visibleStages.map((stage) => {
        const stageLeads = leadsByStage[stage.key] ?? [];
        const stageValue = stageLeads.reduce(
          (sum, l) => sum + Number(l.estimatedValue ?? 0),
          0
        );
        const isOver = overStage === stage.key;

        return (
          <div
            key={stage.key}
            className={cn(
              "flex flex-col rounded-xl border-2 bg-white transition-colors",
              isOver ? "border-brand-400 bg-brand-50/40" : "border-gray-200"
            )}
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDrop={(e) => handleDrop(e, stage.key)}
            onDragLeave={() => setOverStage(null)}
          >
            {/* Stage header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", stage.color)} />
                <span className="text-sm font-semibold text-gray-900">{stage.label}</span>
                <span className="text-xs text-gray-400 ml-1">
                  ({stageLeads.length})
                </span>
              </div>
              {stageValue > 0 && (
                <span className="text-xs text-gray-500 font-medium">
                  {formatCurrency(stageValue)}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-260px)]">
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onDragStart={handleDragStart}
                  isDragging={draggingId === lead.id}
                />
              ))}

              {stageLeads.length === 0 && (
                <div className="h-16 flex items-center justify-center">
                  <p className="text-xs text-gray-300">Drop here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  onDragStart,
  isDragging,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
}) {
  const customerName =
    [lead.customer.firstName, lead.customer.lastName].filter(Boolean).join(" ") ||
    lead.customer.company ||
    "Unknown";

  const typeColors: Record<string, string> = {
    RESIDENTIAL: "bg-blue-100 text-blue-600",
    COMMERCIAL: "bg-purple-100 text-purple-600",
    MUNICIPAL: "bg-green-100 text-green-600",
  };

  const priorityIndicators: Record<string, string> = {
    URGENT: "border-l-4 border-red-400",
    HIGH: "border-l-4 border-orange-400",
    NORMAL: "",
    LOW: "",
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => (window.location.href = `/leads/${lead.id}`)}
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all select-none",
        isDragging && "opacity-40 scale-95",
        priorityIndicators[lead.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-sm text-gray-900 leading-tight">{customerName}</div>
        <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0", typeColors[lead.customer.type])}>
          {lead.customer.type.charAt(0)}
        </span>
      </div>

      {lead.site && (
        <p className="text-xs text-gray-400 mb-1.5">
          {lead.site.city}, {lead.site.state}
        </p>
      )}

      {Number(lead.estimatedValue) > 0 && (
        <p className="text-sm font-semibold text-gray-800 mb-1.5">
          {formatCurrency(Number(lead.estimatedValue))}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          {lead.assignedTo && (
            <div
              className="w-5 h-5 rounded-full bg-brand-200 text-brand-700 text-[9px] font-bold flex items-center justify-center"
              title={lead.assignedTo.name}
            >
              {lead.assignedTo.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )}
          {lead._count.interactions > 0 && (
            <span className="text-xs text-gray-400">
              {lead._count.interactions} notes
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{relativeTime(lead.stageUpdatedAt)}</span>
      </div>
    </div>
  );
}
