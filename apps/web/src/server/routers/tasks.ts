import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const tasksRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        assignedToId: z.string().optional(),
        status: z.string().optional(),
        linkedCustomerId: z.string().optional(),
        linkedJobId: z.string().optional(),
        linkedTicketId: z.string().optional(),
        myTasksOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      const isFieldTech = user.role === "INSTALLER" || user.role === "SERVICE_TECH";

      return ctx.prisma.task.findMany({
        where: {
          ...(isFieldTech || input.myTasksOnly ? { assignedToId: user.id } : {}),
          ...(input.assignedToId ? { assignedToId: input.assignedToId } : {}),
          ...(input.status ? { status: input.status as "TODO" | "IN_PROGRESS" | "DONE" } : {}),
          ...(input.linkedCustomerId ? { linkedCustomerId: input.linkedCustomerId } : {}),
          ...(input.linkedJobId ? { linkedJobId: input.linkedJobId } : {}),
          ...(input.linkedTicketId ? { linkedTicketId: input.linkedTicketId } : {}),
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        assignedToId: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        tags: z.array(z.string()).default([]),
        isRecurring: z.boolean().default(false),
        recurrenceRule: z.string().optional(),
        templateId: z.string().optional(),
        linkedCustomerId: z.string().optional(),
        linkedLeadId: z.string().optional(),
        linkedJobId: z.string().optional(),
        linkedTicketId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.create({
        data: {
          ...input,
          createdById: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        assignedToId: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.task.update({
        where: { id },
        data: {
          ...data,
          ...(data.status === "DONE" ? { completedAt: new Date() } : {}),
        },
      });
    }),

  templates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.taskTemplate.findMany({ where: { isActive: true } });
  }),
});
