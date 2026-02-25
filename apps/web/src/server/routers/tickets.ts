import { z } from "zod";
import { router, protectedProcedure, writeAuditLog } from "../trpc";
import { TRPCError } from "@trpc/server";

export const ticketsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        assignedToId: z.string().optional(),
        priority: z.string().optional(),
        customerId: z.string().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      const isFieldTech = user.role === "INSTALLER" || user.role === "SERVICE_TECH";

      const tickets = await ctx.prisma.serviceTicket.findMany({
        where: {
          ...(input.status ? { status: input.status as "OPEN" | "IN_PROGRESS" | "PENDING_PARTS" | "RESOLVED" | "CLOSED" } : {}),
          ...(input.priority ? { priority: input.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" } : {}),
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(isFieldTech
            ? { assignedToId: user.id }
            : input.assignedToId
            ? { assignedToId: input.assignedToId }
            : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, company: true, phonePrimary: true },
          },
          site: { select: { id: true, address: true, city: true } },
          system: { select: { id: true, brand: true, model: true, serialNumber: true } },
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { photos: true, partUsage: true } },
        },
      });

      let nextCursor: string | undefined;
      if (tickets.length > input.limit) {
        const next = tickets.pop();
        nextCursor = next?.id;
      }

      return { tickets, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.prisma.serviceTicket.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          site: { include: { systems: true } },
          system: true,
          assignedTo: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          waterTests: { orderBy: { testDate: "desc" } },
          partUsage: {
            include: {
              item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } },
              location: { select: { id: true, name: true } },
              usedBy: { select: { id: true, name: true } },
            },
          },
          photos: true,
          invoices: true,
          interactions: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          documents: true,
        },
      });

      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      return ticket;
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        siteId: z.string().optional(),
        systemId: z.string().optional(),
        jobId: z.string().optional(),
        assignedToId: z.string().optional(),
        type: z.enum(["MAINTENANCE", "REPAIR", "EMERGENCY", "WARRANTY", "INSPECTION", "CHEMICAL_FILL"]),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const ticket = await prisma.serviceTicket.create({
        data: {
          ...input,
          createdById: user.id,
        },
      });

      // Send notification to assigned tech
      if (input.assignedToId) {
        const assignedTech = await prisma.user.findUnique({
          where: { id: input.assignedToId },
          select: { phone: true, name: true },
        });
        const customer = await prisma.customer.findUnique({
          where: { id: input.customerId },
          select: { firstName: true, lastName: true },
        });

        if (assignedTech?.phone) {
          try {
            const twilio = (await import("twilio")).default;
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await client.messages.create({
              from: process.env.TWILIO_PHONE_NUMBER,
              to: assignedTech.phone,
              body: `WaterSys: New ${input.type} ticket assigned – ${customer?.firstName} ${customer?.lastName}: ${input.title}`,
            });
          } catch (err) {
            console.error("SMS error:", err);
          }
        }
      }

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "CREATE",
        entityType: "ServiceTicket",
        entityId: ticket.id,
        newValue: { type: input.type, priority: input.priority, customerId: input.customerId },
      });

      return ticket;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"]).optional(),
        assignedToId: z.string().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        resolution: z.string().optional(),
        internalNotes: z.string().optional(),
        scheduledAt: z.date().optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const ticket = await ctx.prisma.serviceTicket.update({
        where: { id },
        data: {
          ...data,
          ...(data.status === "RESOLVED" || data.status === "CLOSED"
            ? { completedAt: data.completedAt ?? new Date() }
            : {}),
        },
      });

      await writeAuditLog(ctx.prisma, {
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "ServiceTicket",
        entityId: id,
        newValue: data,
      });

      return ticket;
    }),

  // Log water test on ticket
  addWaterTest: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        siteId: z.string(),
        systemId: z.string().optional(),
        testDate: z.date(),
        results: z.record(z.union([z.number(), z.string()])),
        notes: z.string().optional(),
        labName: z.string().optional(),
        recommendations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ticketId, ...testData } = input;
      return ctx.prisma.waterTest.create({
        data: {
          ...testData,
          ticketId,
          testedById: ctx.user.id,
        },
      });
    }),

  // Log parts used on ticket
  logPartUsage: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        itemId: z.string(),
        locationId: z.string(),
        quantity: z.number().positive(),
        unitCost: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const { ticketId, ...usageData } = input;

      // Deduct from inventory
      await prisma.inventoryStock.updateMany({
        where: { itemId: input.itemId, locationId: input.locationId },
        data: { quantity: { decrement: input.quantity } },
      });

      return prisma.partUsage.create({
        data: {
          ticketId,
          usedById: user.id,
          unitCost: 0,
          ...usageData,
        },
      });
    }),

  // Summary for dashboard
  summary: protectedProcedure.query(async ({ ctx }) => {
    const [open, overdue, pending] = await Promise.all([
      ctx.prisma.serviceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      ctx.prisma.serviceTicket.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          scheduledAt: { lt: new Date() },
        },
      }),
      ctx.prisma.serviceTicket.count({ where: { status: "PENDING_PARTS" } }),
    ]);
    return { open, overdue, pending };
  }),
});
