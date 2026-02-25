import { z } from "zod";
import { router, protectedProcedure, writeAuditLog } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generatePortalUrl } from "@/lib/utils";

const lineItemSchema = z.object({
  itemType: z.enum(["part", "labor", "flat_rate", "addon", "other"]),
  inventoryItemId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().default(1),
  unitCost: z.number().default(0),
  unitPrice: z.number().default(0),
  packageName: z.string().optional(),
  isInFlatRate: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

const estimateOptionSchema = z.object({
  optionType: z.enum(["BEST", "COST_EFFECTIVE"]),
  title: z.string().min(1),
  scope: z.string().optional(),
  assumptions: z.string().optional(),
  laborDescription: z.string().optional(),
  laborHours: z.number().optional(),
  laborRate: z.number().optional(),
  flatRateAmount: z.number().optional(),
  isFlatRate: z.boolean().default(true),
  taxRate: z.number().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema),
});

export const estimatesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        leadId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.estimate.findMany({
        where: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.leadId ? { leadId: input.leadId } : {}),
          ...(input.status ? { status: input.status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" } : {}),
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, company: true },
          },
          options: {
            select: { id: true, optionType: true, title: true, total: true },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const estimate = await ctx.prisma.estimate.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          site: true,
          lead: true,
          options: {
            include: {
              lineItems: {
                include: {
                  inventoryItem: {
                    select: { id: true, name: true, partNumber: true },
                  },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      return estimate;
    }),

  // Get estimate by portal token (public — for customer portal)
  byToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const estimate = await ctx.prisma.estimate.findUnique({
        where: { portalToken: input.token },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, company: true },
          },
          site: {
            select: { id: true, address: true, city: true, state: true, waterSource: true },
          },
          options: {
            include: { lineItems: { orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      if (estimate.status === "EXPIRED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This estimate has expired." });
      }
      return estimate;
    }),

  create: protectedProcedure
    .input(
      z.object({
        leadId: z.string().optional(),
        customerId: z.string(),
        siteId: z.string().optional(),
        notesToCustomer: z.string().optional(),
        internalNotes: z.string().optional(),
        validityDays: z.number().default(30),
        options: z.array(estimateOptionSchema).length(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const { options, ...estimateData } = input;

      const estimate = await prisma.estimate.create({
        data: {
          ...estimateData,
          createdById: user.id,
          expiresAt: new Date(Date.now() + input.validityDays * 86400000),
          options: {
            create: options.map((opt, idx) => {
              const { lineItems, ...optData } = opt;

              // Calculate totals
              const partsTotal = lineItems
                .filter((li) => !li.isInFlatRate)
                .reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

              const laborTotal = opt.isFlatRate
                ? (opt.flatRateAmount ?? 0)
                : (opt.laborHours ?? 0) * (opt.laborRate ?? 0);

              const subtotal = partsTotal + laborTotal;
              const taxAmount = subtotal * (opt.taxRate ?? 0);
              const total = subtotal + taxAmount;

              return {
                ...optData,
                subtotal,
                taxAmount,
                total,
                sortOrder: idx,
                lineItems: {
                  create: lineItems.map((li, liIdx) => {
                    const margin =
                      li.unitCost > 0
                        ? (li.unitPrice - li.unitCost) / li.unitCost
                        : null;
                    return {
                      ...li,
                      margin,
                      total: li.quantity * li.unitPrice,
                      sortOrder: liIdx,
                    };
                  }),
                },
              };
            }),
          },
        },
        include: {
          options: { include: { lineItems: true } },
        },
      });

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "CREATE",
        entityType: "Estimate",
        entityId: estimate.id,
        newValue: { customerId: input.customerId, status: "DRAFT" },
      });

      return estimate;
    }),

  // Send estimate — creates Dropbox Sign request + sends email
  send: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      const estimate = await prisma.estimate.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          options: { include: { lineItems: true } },
        },
      });

      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      if (estimate.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft estimates can be sent",
        });
      }

      const portalUrl = generatePortalUrl(estimate.portalToken);

      // Create Dropbox Sign signature request
      let dropboxSignRequestId: string | null = null;
      try {
        const { default: HelloSign } = await import("hellosign-sdk");
        const client = new HelloSign({ key: process.env.HELLOSIGN_API_KEY! });

        const customerEmail =
          input.customerEmail ?? estimate.customer.email;
        const customerName =
          [estimate.customer.firstName, estimate.customer.lastName]
            .filter(Boolean)
            .join(" ") || estimate.customer.company || "Customer";

        if (customerEmail) {
          const response = await client.signatureRequest.sendWithTemplate({
            test_mode: process.env.NODE_ENV !== "production" ? 1 : 0,
            signers: [
              {
                email_address: customerEmail,
                name: customerName,
                role: "Customer",
              },
            ],
            subject: "Water Systems — Estimate Ready for Review & Signature",
            message: `Hi ${customerName},\n\nPlease review your water treatment estimate at the link below and sign to accept.\n\n${portalUrl}\n\n${estimate.notesToCustomer ?? ""}`,
            metadata: {
              estimateId: estimate.id,
              portalToken: estimate.portalToken,
            },
          });
          dropboxSignRequestId =
            (response as { signature_request?: { signature_request_id?: string } })
              .signature_request?.signature_request_id ?? null;
        }
      } catch (err) {
        console.error("Dropbox Sign error:", err);
        // Continue even if sign request fails — portal link still works
      }

      // Send email with portal link
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const customerEmail = input.customerEmail ?? estimate.customer.email;
        if (customerEmail) {
          await resend.emails.send({
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: customerEmail,
            subject: "Your Water Treatment Estimate is Ready",
            html: `
              <h2>Your estimate is ready to review</h2>
              <p>Click the link below to view your water test results and treatment options:</p>
              <p><a href="${portalUrl}" style="background:#2279ea;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">View My Estimate</a></p>
              <p>This link expires in ${estimate.validityDays} days.</p>
            `,
          });
        }
      } catch (err) {
        console.error("Email send error:", err);
      }

      // Send SMS if phone provided
      try {
        const customerPhone = input.customerPhone ?? estimate.customer.phonePrimary;
        if (customerPhone) {
          const twilio = (await import("twilio")).default;
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: customerPhone,
            body: `Water Systems: Your estimate is ready! Review and sign here: ${portalUrl}`,
          });
        }
      } catch (err) {
        console.error("SMS send error:", err);
      }

      const updated = await prisma.estimate.update({
        where: { id: input.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          ...(dropboxSignRequestId ? { dropboxSignRequestId } : {}),
        },
      });

      // Update lead stage
      if (estimate.leadId) {
        await prisma.lead.update({
          where: { id: estimate.leadId },
          data: { stage: "ESTIMATE_SENT", stageUpdatedAt: new Date() },
        });
      }

      await writeAuditLog(prisma, {
        userId: user.id,
        action: "ESTIMATE_SENT",
        entityType: "Estimate",
        entityId: input.id,
      });

      return updated;
    }),

  // Handle Dropbox Sign webhook (called by webhook endpoint, not tRPC)
  // This is implemented in the API route instead
});
