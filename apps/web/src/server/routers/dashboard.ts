import { router, protectedProcedure } from "../trpc";

export const dashboardRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;

    const [
      pipelineStats,
      todayJobs,
      ticketSummary,
      warrantyExpiring,
      maintenanceDue,
      lowStock,
      openInvoicesTotal,
    ] = await Promise.all([
      // Pipeline value + count
      prisma.lead.aggregate({
        where: { closedAt: null },
        _count: true,
        _sum: { estimatedValue: true },
      }),

      // Today's jobs
      prisma.job.count({
        where: {
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          scheduledStart: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),

      // Ticket summary
      prisma.serviceTicket.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Warranties expiring in 30 days
      prisma.system.count({
        where: {
          warrantyEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 86400000),
          },
        },
      }),

      // Maintenance due this month
      prisma.maintenancePlan.count({
        where: {
          isActive: true,
          nextServiceDate: {
            lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          },
        },
      }),

      // Low stock items
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM inventory_items i
        WHERE i.is_active = true
          AND i.reorder_point IS NOT NULL
          AND (
            SELECT COALESCE(SUM(s.quantity), 0)
            FROM inventory_stock s
            WHERE s.item_id = i.id
          ) <= i.reorder_point
      `,

      // Open invoices total (AR)
      prisma.invoice.aggregate({
        where: { status: { in: ["SENT"] } },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      pipeline: {
        activeLeads: pipelineStats._count,
        totalValue: Number(pipelineStats._sum.estimatedValue ?? 0),
      },
      todayJobs,
      tickets: {
        open: ticketSummary.find((s) => s.status === "OPEN")?._count ?? 0,
        inProgress: ticketSummary.find((s) => s.status === "IN_PROGRESS")?._count ?? 0,
        pendingParts: ticketSummary.find((s) => s.status === "PENDING_PARTS")?._count ?? 0,
      },
      warrantyExpiring,
      maintenanceDue,
      lowStockItems: Number(lowStock[0]?.count ?? 0),
      ar: {
        outstanding: Number(openInvoicesTotal._sum.total ?? 0),
        invoiceCount: openInvoicesTotal._count,
      },
    };
  }),
});
