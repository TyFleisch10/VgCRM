import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure, writeAuditLog } from "../trpc";
import { TRPCError } from "@trpc/server";

const adminProcedure = createPermissionProcedure("canManageUsers");

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
  }),

  // Field techs only (for assignment dropdowns)
  techs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["INSTALLER", "SERVICE_TECH"] },
      },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["OWNER", "OFFICE_MANAGER", "RECEPTIONIST", "INSTALLER", "SERVICE_TECH"]),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      // Create in Supabase Auth
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: authUser, error } = await adminClient.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        password: Math.random().toString(36).slice(-12),
      });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      const dbUser = await prisma.user.create({
        data: input,
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "CREATE",
        entityType: "User",
        entityId: dbUser.id,
        newValue: { email: input.email, role: input.role },
      });

      return dbUser;
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(["OWNER", "OFFICE_MANAGER", "RECEPTIONIST", "INSTALLER", "SERVICE_TECH"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const existing = await prisma.user.findUnique({
        where: { id: input.id },
        select: { role: true },
      });

      const updated = await prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "PERMISSION_CHANGE",
        entityType: "User",
        entityId: input.id,
        oldValue: { role: existing?.role },
        newValue: { role: input.role },
      });

      return updated;
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});
