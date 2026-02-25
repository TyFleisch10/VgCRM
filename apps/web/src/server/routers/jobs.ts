import { z } from "zod";
import { router, protectedProcedure, writeAuditLog } from "../trpc";
import { TRPCError } from "@trpc/server";

export const jobsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        assignedToId: z.string().optional(),
        type: z.string().optional(),
        scheduledDate: z.date().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      const isFieldTech = user.role === "INSTALLER" || user.role === "SERVICE_TECH";

      const jobs = await ctx.prisma.job.findMany({
        where: {
          ...(input.status ? { status: input.status as "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE" | "INVOICED" | "CANCELLED" } : {}),
          ...(input.type ? { type: input.type as "INSTALLATION" | "MUNICIPAL_PROJECT" | "SERVICE_CALL" | "MAINTENANCE" } : {}),
          ...(isFieldTech
            ? { assignments: { some: { userId: user.id } } }
            : input.assignedToId
            ? { assignments: { some: { userId: input.assignedToId } } }
            : {}),
          ...(input.scheduledDate
            ? {
                scheduledStart: {
                  gte: new Date(input.scheduledDate.setHours(0, 0, 0, 0)),
                  lt: new Date(input.scheduledDate.setHours(23, 59, 59, 999)),
                },
              }
            : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, company: true, phonePrimary: true },
          },
          site: {
            select: { id: true, address: true, city: true, state: true, lat: true, lng: true },
          },
          assignments: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          milestones: true,
          _count: { select: { partUsage: true, waterTests: true } },
        },
      });

      let nextCursor: string | undefined;
      if (jobs.length > input.limit) {
        const next = jobs.pop();
        nextCursor = next?.id;
      }

      return { jobs, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          site: { include: { systems: { include: { photos: true } } } },
          assignments: {
            include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } },
          },
          milestones: { orderBy: { sortOrder: "asc" } },
          checklists: true,
          waterTests: { orderBy: { testDate: "desc" } },
          partUsage: {
            include: {
              item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } },
              location: { select: { id: true, name: true, type: true } },
              usedBy: { select: { id: true, name: true } },
            },
          },
          invoices: { orderBy: { createdAt: "desc" } },
          interactions: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          documents: { orderBy: { createdAt: "desc" } },
          tasks: { orderBy: { dueDate: "asc" } },
          estimate: {
            include: {
              options: { include: { lineItems: true } },
            },
          },
          lead: { select: { id: true, stage: true } },
        },
      });

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      return job;
    }),

  // Create job from accepted estimate
  createFromEstimate: protectedProcedure
    .input(
      z.object({
        estimateId: z.string(),
        description: z.string().optional(),
        assignedTechIds: z.array(z.string()).default([]),
        scheduledStart: z.date().optional(),
        scheduledEnd: z.date().optional(),
        checklistTemplateId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const estimate = await prisma.estimate.findUnique({
        where: { id: input.estimateId },
        include: { lead: true },
      });

      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });

      const job = await prisma.job.create({
        data: {
          leadId: estimate.leadId ?? undefined,
          estimateId: input.estimateId,
          customerId: estimate.customerId,
          siteId: estimate.siteId ?? undefined,
          type: "INSTALLATION",
          description: input.description,
          checklistTemplateId: input.checklistTemplateId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          createdById: user.id,
          assignments: {
            create: input.assignedTechIds.map((userId) => ({ userId })),
          },
        },
      });

      // Update lead stage to SCHEDULED if dates provided
      if (estimate.leadId && input.scheduledStart) {
        await prisma.lead.update({
          where: { id: estimate.leadId },
          data: { stage: "SCHEDULED", stageUpdatedAt: new Date() },
        });
      }

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "CREATE",
        entityType: "Job",
        entityId: job.id,
        newValue: { estimateId: input.estimateId, type: "INSTALLATION" },
      });

      return job;
    }),

  // Update job status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETE", "INVOICED", "CANCELLED"]),
        completionNotes: z.string().optional(),
        actualStart: z.date().optional(),
        actualEnd: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const existing = await prisma.job.findUnique({
        where: { id: input.id },
        select: { status: true, leadId: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const job = await prisma.job.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.completionNotes ? { completionNotes: input.completionNotes } : {}),
          ...(input.actualStart ? { actualStart: input.actualStart } : {}),
          ...(input.status === "COMPLETE"
            ? { actualEnd: input.actualEnd ?? new Date() }
            : {}),
        },
      });

      // Update lead stage
      if (existing.leadId) {
        if (input.status === "COMPLETE") {
          await prisma.lead.update({
            where: { id: existing.leadId },
            data: { stage: "INSTALLED", stageUpdatedAt: new Date() },
          });
        } else if (input.status === "INVOICED") {
          await prisma.lead.update({
            where: { id: existing.leadId },
            data: { stage: "BILLED", stageUpdatedAt: new Date() },
          });
        }
      }

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "UPDATE",
        entityType: "Job",
        entityId: input.id,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
      });

      return job;
    }),

  // Update checklist item
  updateChecklistItem: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        checklistId: z.string(),
        itemId: z.string(),
        completed: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const checklist = await ctx.prisma.jobChecklist.findUnique({
        where: { id: input.checklistId },
      });
      if (!checklist) throw new TRPCError({ code: "NOT_FOUND" });

      const items = checklist.items as Array<{
        id: string;
        completed?: boolean;
        completedAt?: string;
        completedById?: string;
        notes?: string;
      }>;

      const updated = items.map((item) =>
        item.id === input.itemId
          ? {
              ...item,
              completed: input.completed,
              completedAt: input.completed ? new Date().toISOString() : null,
              completedById: input.completed ? ctx.user.id : null,
              notes: input.notes ?? item.notes,
            }
          : item
      );

      return ctx.prisma.jobChecklist.update({
        where: { id: input.checklistId },
        data: { items: updated },
      });
    }),

  // Log parts used on job
  logPartUsage: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        itemId: z.string(),
        locationId: z.string(),
        quantity: z.number().positive(),
        unitCost: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      // Deduct from inventory
      await prisma.inventoryStock.updateMany({
        where: { itemId: input.itemId, locationId: input.locationId },
        data: { quantity: { decrement: input.quantity } },
      });

      const usage = await prisma.partUsage.create({
        data: {
          jobId: input.jobId,
          itemId: input.itemId,
          locationId: input.locationId,
          quantity: input.quantity,
          unitCost: input.unitCost ?? 0,
          usedById: user.id,
          notes: input.notes,
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "INVENTORY_ADJUST",
        entityType: "InventoryStock",
        entityId: input.itemId,
        newValue: { action: "deduct", quantity: input.quantity, jobId: input.jobId, locationId: input.locationId },
      });

      return usage;
    }),

  // Today's schedule (for dashboard)
  todaySchedule: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    const isFieldTech = user.role === "INSTALLER" || user.role === "SERVICE_TECH";
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    return ctx.prisma.job.findMany({
      where: {
        scheduledStart: { gte: start, lte: end },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        ...(isFieldTech ? { assignments: { some: { userId: user.id } } } : {}),
      },
      orderBy: { scheduledStart: "asc" },
      include: {
        customer: { select: { firstName: true, lastName: true, company: true } },
        site: { select: { address: true, city: true } },
        assignments: {
          include: { user: { select: { name: true } } },
        },
      },
    });
  }),
});
