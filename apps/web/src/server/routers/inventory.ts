import { z } from "zod";
import { router, protectedProcedure, writeAuditLog } from "../trpc";

export const inventoryRouter = router({
  // All locations with their stock
  locations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  // Items with stock across all locations
  items: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        lowStockOnly: z.boolean().default(false),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.inventoryItem.findMany({
        where: {
          isActive: true,
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { partNumber: { contains: input.search, mode: "insensitive" } },
                  { description: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(input.category ? { category: input.category } : {}),
        },
        include: {
          stock: {
            include: {
              location: { select: { id: true, name: true, type: true } },
            },
            ...(input.locationId ? { where: { locationId: input.locationId } } : {}),
          },
        },
        orderBy: { name: "asc" },
      });

      // Filter low stock
      if (input.lowStockOnly) {
        return items.filter((item) => {
          const total = item.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
          return item.reorderPoint != null && total <= Number(item.reorderPoint);
        });
      }

      return items;
    }),

  // Stock matrix: all items × all locations
  stockMatrix: protectedProcedure.query(async ({ ctx }) => {
    const [items, locations, stock] = await Promise.all([
      ctx.prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true, partNumber: true, category: true, reorderPoint: true, unitOfMeasure: true },
      }),
      ctx.prisma.inventoryLocation.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      ctx.prisma.inventoryStock.findMany({
        include: { location: true },
      }),
    ]);

    // Build matrix: itemId → locationId → quantity
    const matrix: Record<string, Record<string, number>> = {};
    stock.forEach((s) => {
      if (!matrix[s.itemId]) matrix[s.itemId] = {};
      matrix[s.itemId][s.locationId] = Number(s.quantity);
    });

    return { items, locations, matrix };
  }),

  // Low stock alerts
  lowStockAlerts: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.prisma.inventoryItem.findMany({
      where: { isActive: true, reorderPoint: { not: null } },
      include: { stock: { include: { location: { select: { name: true } } } } },
    });

    return items
      .map((item) => {
        const total = item.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
        return { ...item, totalQuantity: total };
      })
      .filter((item) => item.totalQuantity <= Number(item.reorderPoint ?? 0));
  }),

  // Transfer stock between locations
  transfer: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        fromLocationId: z.string().optional(),
        toLocationId: z.string().optional(),
        quantity: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      // Deduct from source
      if (input.fromLocationId) {
        await prisma.inventoryStock.updateMany({
          where: { itemId: input.itemId, locationId: input.fromLocationId },
          data: { quantity: { decrement: input.quantity } },
        });
      }

      // Add to destination
      if (input.toLocationId) {
        await prisma.inventoryStock.upsert({
          where: {
            itemId_locationId: { itemId: input.itemId, locationId: input.toLocationId },
          },
          update: { quantity: { increment: input.quantity } },
          create: {
            itemId: input.itemId,
            locationId: input.toLocationId,
            quantity: input.quantity,
          },
        });
      }

      const transfer = await prisma.inventoryTransfer.create({
        data: {
          itemId: input.itemId,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          quantity: input.quantity,
          transferredById: user.id,
          notes: input.notes,
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "INVENTORY_ADJUST",
        entityType: "InventoryTransfer",
        entityId: transfer.id,
        newValue: {
          itemId: input.itemId,
          quantity: input.quantity,
          from: input.fromLocationId,
          to: input.toLocationId,
        },
      });

      return transfer;
    }),

  // Adjust stock (manual count correction)
  adjust: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        locationId: z.string(),
        newQuantity: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const existing = await prisma.inventoryStock.findUnique({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.locationId } },
      });

      const stock = await prisma.inventoryStock.upsert({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.locationId } },
        update: { quantity: input.newQuantity, lastCounted: new Date() },
        create: {
          itemId: input.itemId,
          locationId: input.locationId,
          quantity: input.newQuantity,
          lastCounted: new Date(),
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "INVENTORY_ADJUST",
        entityType: "InventoryStock",
        newValue: {
          itemId: input.itemId,
          locationId: input.locationId,
          oldQuantity: existing ? Number(existing.quantity) : 0,
          newQuantity: input.newQuantity,
          notes: input.notes,
        },
      });

      return stock;
    }),

  createItem: protectedProcedure
    .input(
      z.object({
        sku: z.string().optional(),
        partNumber: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        unitOfMeasure: z.string().default("EA"),
        unitCost: z.number().default(0),
        unitPrice: z.number().default(0),
        reorderPoint: z.number().optional(),
        qboItemId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.inventoryItem.create({ data: input });
    }),

  // Transfer history for an item
  transferHistory: protectedProcedure
    .input(z.object({ itemId: z.string(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.inventoryTransfer.findMany({
        where: { itemId: input.itemId },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
          transferredBy: { select: { name: true } },
        },
      });
    }),
});
