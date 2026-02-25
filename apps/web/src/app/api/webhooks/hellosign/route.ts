import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@watersys/db";
import crypto from "crypto";

// Dropbox Sign (HelloSign) webhook handler
// Configure this URL in the Dropbox Sign API settings
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const signature = req.headers.get("x-hello-sign-hmac-signature");
  const expectedSig = crypto
    .createHmac("sha256", process.env.HELLOSIGN_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex");

  if (signature !== expectedSig) {
    console.error("HelloSign webhook: invalid signature");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let payload: {
    event: {
      event_type: string;
      event_time: string;
      event_metadata: {
        related_signature_id?: string;
        reported_for_account_id?: string;
      };
    };
    signature_request: {
      signature_request_id: string;
      metadata?: {
        estimateId?: string;
        optionId?: string;
        portalToken?: string;
      };
      signatures?: Array<{
        signer_email_address: string;
        signer_name: string;
        signed_at?: number;
        status_code: string;
      }>;
    };
  };

  try {
    const parsed = JSON.parse(body) as { payload: typeof payload };
    payload = parsed.payload;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const eventType = payload?.event?.event_type;

  if (eventType === "signature_request_all_signed") {
    const signatureRequest = payload.signature_request;
    const metadata = signatureRequest?.metadata ?? {};
    const estimateId = metadata.estimateId;

    if (estimateId) {
      const estimate = await prisma.estimate.findUnique({
        where: { id: estimateId },
        include: { lead: true },
      });

      if (estimate && estimate.status !== "ACCEPTED") {
        const optionType = metadata.optionId
          ? await prisma.estimateOption.findUnique({
              where: { id: metadata.optionId },
              select: { optionType: true },
            })
          : null;

        await prisma.estimate.update({
          where: { id: estimateId },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            acceptedOptionType: optionType?.optionType ?? undefined,
            signatureTimestamp: new Date(),
          },
        });

        // Update lead stage
        if (estimate.leadId) {
          await prisma.lead.update({
            where: { id: estimate.leadId },
            data: { stage: "ESTIMATE_ACCEPTED", stageUpdatedAt: new Date() },
          });

          // Log interaction
          await prisma.interaction.create({
            data: {
              customerId: estimate.customerId,
              leadId: estimate.leadId,
              estimateId: estimateId,
              type: "ESTIMATE",
              summary: "Estimate accepted — customer signed",
              metadata: {
                signatureRequestId: signatureRequest.signature_request_id,
                optionType: optionType?.optionType,
              },
            } as Parameters<typeof prisma.interaction.create>[0]['data'],
          });
        }

        // Notify office via SMS/email
        try {
          const twilio = (await import("twilio")).default;
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          // Get office manager phones from DB
          const managers = await prisma.user.findMany({
            where: { role: { in: ["OWNER", "OFFICE_MANAGER"] }, isActive: true, phone: { not: null } },
            select: { phone: true },
          });

          const customer = await prisma.customer.findUnique({
            where: { id: estimate.customerId },
            select: { firstName: true, lastName: true, company: true },
          });
          const customerName =
            [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
            customer?.company ||
            "Customer";

          for (const manager of managers) {
            if (manager.phone) {
              await client.messages
                .create({
                  from: process.env.TWILIO_PHONE_NUMBER,
                  to: manager.phone,
                  body: `WaterSys: ${customerName} just accepted their estimate! Log in to schedule.`,
                })
                .catch(console.error);
            }
          }
        } catch (err) {
          console.error("Notification error:", err);
        }

        await prisma.auditLog.create({
          data: {
            action: "ESTIMATE_ACCEPTED",
            entityType: "Estimate",
            entityId: estimateId,
            newValue: {
              signatureRequestId: signatureRequest.signature_request_id,
              acceptedOptionType: optionType?.optionType,
            },
          },
        });
      }
    }
  }

  // HelloSign requires this exact response
  return new NextResponse("Hello API Event Received", { status: 200 });
}
