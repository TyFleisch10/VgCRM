import { notFound } from "next/navigation";
import { prisma } from "@watersys/db";
import { WATER_TEST_PARAMETERS } from "@watersys/shared";
import { PortalEstimateAcceptance } from "@/components/portal/estimate-acceptance";

interface Props {
  params: { token: string };
}

export default async function PortalPage({ params }: Props) {
  const estimate = await prisma.estimate.findUnique({
    where: { portalToken: params.token },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          email: true,
        },
      },
      site: {
        include: {
          waterTests: {
            orderBy: { testDate: "desc" },
            take: 1,
          },
        },
      },
      options: {
        include: {
          lineItems: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!estimate) notFound();

  if (estimate.status === "EXPIRED") {
    return (
      <PortalShell customerName={getCustomerName(estimate.customer)}>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⏰</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Estimate Expired</h2>
          <p className="text-gray-500">This estimate link has expired. Please contact us for an updated estimate.</p>
        </div>
      </PortalShell>
    );
  }

  if (estimate.status === "ACCEPTED") {
    return (
      <PortalShell customerName={getCustomerName(estimate.customer)}>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Estimate Accepted</h2>
          <p className="text-gray-500">
            You&apos;ve already accepted the{" "}
            <strong>{estimate.acceptedOptionType === "BEST" ? "Best Solution" : "Cost-Effective"}</strong> option.
            Our team will be in touch to schedule your installation.
          </p>
        </div>
      </PortalShell>
    );
  }

  const latestTest = estimate.site?.waterTests?.[0] ?? null;
  const customerName = getCustomerName(estimate.customer);

  return (
    <PortalShell customerName={customerName}>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {estimate.customer.firstName ?? customerName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Your water treatment estimate is ready. Review your water test results and choose the option that&apos;s right for you.
          </p>
          {estimate.notesToCustomer && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              {estimate.notesToCustomer}
            </div>
          )}
        </div>

        {/* Water Test Results */}
        {latestTest && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Water Test Results
              <span className="ml-2 text-sm font-normal text-gray-400">
                {new Date(latestTest.testDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WATER_TEST_PARAMETERS.map((param) => {
                  const results = latestTest.results as Record<string, string | number>;
                  const value = results[param.key];
                  if (value == null) return null;

                  return (
                    <div key={param.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{param.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {value} {param.unit}
                        </span>
                        <div className="text-xs text-gray-400">Normal: {param.normal}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Estimate Options + Acceptance (client component) */}
        <PortalEstimateAcceptance
          estimateId={estimate.id}
          portalToken={params.token}
          options={estimate.options.map((opt) => ({
            id: opt.id,
            optionType: opt.optionType,
            title: opt.title,
            scope: opt.scope,
            isFlatRate: opt.isFlatRate,
            flatRateAmount: opt.flatRateAmount ? Number(opt.flatRateAmount) : null,
            laborHours: opt.laborHours ? Number(opt.laborHours) : null,
            laborRate: opt.laborRate ? Number(opt.laborRate) : null,
            subtotal: Number(opt.subtotal),
            taxRate: Number(opt.taxRate),
            taxAmount: Number(opt.taxAmount),
            total: Number(opt.total),
            notes: opt.notes,
            lineItems: opt.lineItems.map((li) => ({
              id: li.id,
              description: li.description,
              quantity: Number(li.quantity),
              unitPrice: Number(li.unitPrice),
              total: Number(li.total),
              isInFlatRate: li.isInFlatRate,
            })),
          }))}
          dropboxSignRequestId={estimate.dropboxSignRequestId}
          expiresAt={estimate.expiresAt}
        />

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <p>
            Questions? Contact us at{" "}
            <a href="tel:+1-555-000-0000" className="text-brand-600 hover:underline">
              (555) 000-0000
            </a>
          </p>
          {estimate.expiresAt && (
            <p className="mt-1">
              This estimate expires on{" "}
              {new Date(estimate.expiresAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function PortalShell({
  customerName,
  children,
}: {
  customerName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Water Systems</div>
            <div className="text-xs text-gray-400">Customer Portal</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function getCustomerName(customer: {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}): string {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.company ||
    "Customer"
  );
}
