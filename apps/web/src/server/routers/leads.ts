import { z } from "zod";
import { router, protectedProcedure, writeAuditLog } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { LeadStage } from "@watersys/db";

const createLeadSchema = z.object({
  customerId: z.string().optional(),
  // Or create customer inline (mobile quick-add)
  newCustomer: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phonePrimary: z.string().optional(),
      type: z.enum(["RESIDENTIAL", "COMMERCIAL", "MUNICIPAL"]).default("RESIDENTIAL"),
    })
    .optional(),
  siteId: z.string().optional(),
  source: z
    .enum([
      "REFERRAL",
      "OWNER_NETWORK",
      "COLD_CALL",
      "WEBSITE",
      "SOCIAL_MEDIA",
      "REPEAT_CUSTOMER",
      "OTHER",
    ])
    .default("OTHER"),
  referralContactId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  notes: z.string().optional(),
  estimatedValue: z.number().optional(),
  // For new site
  siteAddress: z.string().optional(),
  siteCity: z.string().optional(),
  siteState: z.string().optional(),
  siteZip: z.string().optional(),
  waterSource: z
    .enum(["WELL", "MUNICIPAL", "SURFACE", "OTHER"])
    .optional(),
});

export const leadsRouter = router({
  // List all leads (with filtering)
  list: protectedProcedure
    .input(
      z.object({
        stage: z.string().optional(),
        assignedToId: z.string().optional(),
        source: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const isFieldTech =
        user.role === "INSTALLER" || user.role === "SERVICE_TECH";

      const where: Record<string, unknown> = {
        ...(input.stage ? { stage: input.stage as LeadStage } : {}),
        ...(isFieldTech ? { assignedToId: user.id } : {}),
        ...(input.assignedToId ? { assignedToId: input.assignedToId } : {}),
        ...(input.source ? { source: input.source } : {}),
        ...(input.search
          ? {
              OR: [
                { customer: { firstName: { contains: input.search, mode: "insensitive" } } },
                { customer: { lastName: { contains: input.search, mode: "insensitive" } } },
                { customer: { company: { contains: input.search, mode: "insensitive" } } },
                { customer: { phonePrimary: { contains: input.search } } },
              ],
            }
          : {}),
      };

      const leads = await prisma.lead.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ stage: "asc" }, { stageUpdatedAt: "desc" }],
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              type: true,
              phonePrimary: true,
              email: true,
            },
          },
          assignedTo: {
            select: { id: true, name: true, avatarUrl: true },
          },
          site: {
            select: { id: true, address: true, city: true, state: true },
          },
          _count: {
            select: { estimates: true, interactions: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (leads.length > input.limit) {
        const next = leads.pop();
        nextCursor = next?.id;
      }

      return { leads, nextCursor };
    }),

  // Get pipeline summary (counts + values by stage)
  pipelineSummary: protectedProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    const stages = [
      "NEW", "CONTACTED", "WATER_TEST", "ESTIMATE_SENT",
      "ESTIMATE_ACCEPTED", "SCHEDULED", "INSTALLED", "BILLED",
    ] as LeadStage[];

    const results = await Promise.all(
      stages.map(async (stage) => {
        const agg = await prisma.lead.aggregate({
          where: { stage },
          _count: true,
          _sum: { estimatedValue: true },
        });
        return {
          stage,
          count: agg._count,
          value: Number(agg._sum.estimatedValue ?? 0),
        };
      })
    );

    return results;
  }),

  // Get single lead with full detail
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          site: { include: { systems: true } },
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          estimates: {
            include: { options: true },
            orderBy: { createdAt: "desc" },
          },
          jobs: {
            include: {
              assignments: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          },
          interactions: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      return lead;
    }),

  // Create lead (with optional inline customer creation)
  create: protectedProcedure
    .input(createLeadSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      let customerId = input.customerId;

      // Create customer inline if needed (mobile quick-add)
      if (!customerId && input.newCustomer) {
        const customer = await prisma.customer.create({
          data: {
            ...input.newCustomer,
            referralSource: input.source === "REFERRAL" ? "REFERRAL" : undefined,
            referralContactId: input.referralContactId,
            createdById: user.id,
          },
        });
        customerId = customer.id;
      }

      if (!customerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either customerId or newCustomer is required",
        });
      }

      // Create site if address provided
      let siteId = input.siteId;
      if (!siteId && input.siteAddress) {
        const site = await prisma.site.create({
          data: {
            customerId,
            address: input.siteAddress,
            city: input.siteCity ?? "",
            state: input.siteState ?? "",
            zip: input.siteZip ?? "",
            waterSource: input.waterSource ?? "WELL",
          },
        });
        siteId = site.id;
      }

      const lead = await prisma.lead.create({
        data: {
          customerId,
          siteId,
          source: input.source,
          referralContactId: input.referralContactId,
          assignedToId: input.assignedToId,
          priority: input.priority,
          notes: input.notes,
          estimatedValue: input.estimatedValue,
          createdById: user.id,
        },
        include: {
          customer: true,
          site: true,
        },
      });

      // Log interaction
      await prisma.interaction.create({
        data: {
          customerId,
          leadId: lead.id,
          type: "STATUS_CHANGE",
          summary: "Lead created",
          userId: user.id,
          metadata: { stage: "NEW", source: input.source },
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "CREATE",
        entityType: "Lead",
        entityId: lead.id,
        newValue: { stage: "NEW", customerId },
      });

      return lead;
    }),

  // Update stage
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        stage: z.enum([
          "NEW", "CONTACTED", "WATER_TEST", "ESTIMATE_SENT",
          "ESTIMATE_ACCEPTED", "SCHEDULED", "INSTALLED", "BILLED",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const existing = await prisma.lead.findUnique({
        where: { id: input.id },
        select: { stage: true, customerId: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const lead = await prisma.lead.update({
        where: { id: input.id },
        data: {
          stage: input.stage as LeadStage,
          stageUpdatedAt: new Date(),
        },
      });

      await prisma.interaction.create({
        data: {
          customerId: existing.customerId,
          leadId: input.id,
          type: "STATUS_CHANGE",
          summary: `Stage updated: ${existing.stage} → ${input.stage}`,
          notes: input.notes,
          userId: user.id,
          metadata: { stage_from: existing.stage, stage_to: input.stage },
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "STAGE_CHANGE",
        entityType: "Lead",
        entityId: input.id,
        oldValue: { stage: existing.stage },
        newValue: { stage: input.stage },
      });

      return lead;
    }),

  // Update lead
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        assignedToId: z.string().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        notes: z.string().optional(),
        estimatedValue: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.lead.update({
        where: { id },
        data,
      });
    }),

  // Close lead (won/lost)
  close: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        closeReason: z.enum(["WON", "LOST", "DUPLICATE", "NO_RESPONSE", "NOT_QUALIFIED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const lead = await prisma.lead.update({
        where: { id: input.id },
        data: {
          closeReason: input.closeReason,
          closedAt: new Date(),
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "UPDATE",
        entityType: "Lead",
        entityId: input.id,
        newValue: { closeReason: input.closeReason },
      });

      return lead;
    }),
});
