import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@watersys/db";
import type { UserRole } from "@watersys/db";
import { ROLE_PERMISSIONS } from "@watersys/shared";

// ─── Context ───────────────────────────────────────────────────────────────

export async function createTRPCContext(opts: { req: NextRequest }) {
  const supabase = createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  let dbUser = null;
  if (supabaseUser) {
    dbUser = await prisma.user.findUnique({
      where: { email: supabaseUser.email! },
    });
  }

  return {
    req: opts.req,
    supabaseUser,
    user: dbUser,
    prisma,
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC init ─────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Middleware ─────────────────────────────────────────────────────────────

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Role-based permission middleware factory
function requirePermission(permission: keyof typeof ROLE_PERMISSIONS.OWNER) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const perms = ROLE_PERMISSIONS[ctx.user.role as UserRole];
    if (!perms[permission]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Insufficient permissions: ${permission} required`,
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// Audit log helper
async function writeAuditLog(
  prismaClient: typeof prisma,
  params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }
) {
  await prismaClient.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
      newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
      ipAddress: params.ipAddress,
    },
  });
}

// ─── Exports ────────────────────────────────────────────────────────────────

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

export function createPermissionProcedure(
  permission: keyof typeof ROLE_PERMISSIONS.OWNER
) {
  return t.procedure.use(requirePermission(permission));
}

export { writeAuditLog };
