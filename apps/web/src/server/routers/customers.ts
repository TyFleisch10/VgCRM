import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const customerSchema = z.object({
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "MUNICIPAL"]).default("RESIDENTIAL"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phonePrimary: z.string().optional(),
  phoneSecondary: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  referralSource: z
    .enum(["REFERRAL", "OWNER_NETWORK", "COLD_CALL", "WEBSITE", "SOCIAL_MEDIA", "REPEAT_CUSTOMER", "OTHER"])
    .optional(),
  referralContactId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const customersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const customers = await ctx.prisma.customer.findMany({
        where: {
          isActive: true,
          ...(input.type ? { type: input.type as "RESIDENTIAL" | "COMMERCIAL" | "MUNICIPAL" } : {}),
          ...(input.search
            ? {
                OR: [
                  { firstName: { contains: input.search, mode: "insensitive" } },
                  { lastName: { contains: input.search, mode: "insensitive" } },
                  { company: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                  { phonePrimary: { contains: input.search } },
                ],
              }
            : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          sites: { select: { id: true, address: true, city: true, state: true } },
          _count: {
            select: { leads: true, jobs: true, tickets: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (customers.length > input.limit) {
        const next = customers.pop();
        nextCursor = next?.id;
      }

      return { customers, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { id: input.id },
        include: {
          sites: {
            include: {
              systems: {
                include: { photos: true },
              },
            },
          },
          leads: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          jobs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              assignments: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          },
          tickets: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          maintenancePlans: {
            include: {
              system: { select: { id: true, brand: true, model: true } },
            },
          },
          documents: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      return customer;
    }),

  create: protectedProcedure
    .input(customerSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customer.create({
        data: {
          ...input,
          createdById: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(customerSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.customer.update({
        where: { id },
        data,
      });
    }),

  // Add a note/interaction to timeline
  addInteraction: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        type: z.enum(["CALL", "EMAIL", "SMS", "VISIT", "NOTE"]),
        summary: z.string().min(1),
        notes: z.string().optional(),
        leadId: z.string().optional(),
        jobId: z.string().optional(),
        ticketId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.interaction.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      });
    }),

  // Search (global search support)
  search: protectedProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: input.q, mode: "insensitive" } },
            { lastName: { contains: input.q, mode: "insensitive" } },
            { company: { contains: input.q, mode: "insensitive" } },
            { email: { contains: input.q, mode: "insensitive" } },
            { phonePrimary: { contains: input.q } },
          ],
        },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          type: true,
          phonePrimary: true,
          email: true,
        },
      });
    }),
});
