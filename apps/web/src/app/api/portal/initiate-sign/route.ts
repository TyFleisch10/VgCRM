import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@watersys/db";
import { generatePortalUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { estimateId, portalToken, optionId } = await req.json() as {
    estimateId: string;
    portalToken: string;
    optionId: string;
  };

  // Verify token matches estimate
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId, portalToken },
    include: {
      customer: {
        select: { firstName: true, lastName: true, company: true, email: true },
      },
    },
  });

  if (!estimate || estimate.status === "EXPIRED" || estimate.status === "ACCEPTED") {
    return NextResponse.json({ error: "Invalid or expired estimate" }, { status: 400 });
  }

  const customerName =
    [estimate.customer.firstName, estimate.customer.lastName].filter(Boolean).join(" ") ||
    estimate.customer.company ||
    "Customer";

  try {
    const { default: HelloSign } = await import("hellosign-sdk");
    const client = new HelloSign({ key: process.env.HELLOSIGN_API_KEY! });

    // Create embedded sign request
    const response = await client.signatureRequest.createEmbedded({
      test_mode: process.env.NODE_ENV !== "production" ? 1 : 0,
      clientId: process.env.HELLOSIGN_CLIENT_ID!,
      signers: [
        {
          email_address: estimate.customer.email ?? "noemail@placeholder.com",
          name: customerName,
          role: "Customer",
          order: 0,
        },
      ],
      subject: "Water Systems — Estimate Acceptance",
      message: `${customerName} is accepting a water treatment estimate from Water Systems.`,
      files: [],
      form_fields_per_document: [],
      metadata: {
        estimateId,
        optionId,
        portalToken,
      },
      signing_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}?signed=1`,
    });

    const signatureRequestId = (response as {
      signature_request?: { signature_request_id?: string; signatures?: Array<{ signature_id: string }> };
    }).signature_request?.signature_request_id;

    const signerId = (response as {
      signature_request?: { signatures?: Array<{ signature_id: string }> };
    }).signature_request?.signatures?.[0]?.signature_id;

    if (!signerId) {
      throw new Error("No signer ID returned");
    }

    // Get embedded sign URL
    const embedded = await client.embedded.getSignUrl(signerId);
    const signUrl = (embedded as { embedded?: { sign_url?: string } }).embedded?.sign_url;

    // Update estimate with sign request ID
    if (signatureRequestId) {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { dropboxSignRequestId: signatureRequestId },
      });
    }

    // Record which option was selected
    await prisma.estimate.update({
      where: { id: estimateId },
      data: {
        acceptedOptionType: (await prisma.estimateOption.findUnique({
          where: { id: optionId },
          select: { optionType: true },
        }))?.optionType ?? undefined,
        signatureIp: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
        signatureDevice: req.headers.get("user-agent") ?? "unknown",
      },
    });

    return NextResponse.json({ signUrl });
  } catch (err) {
    console.error("Dropbox Sign error:", err);
    return NextResponse.json(
      { error: "Failed to initiate signing. Please contact us directly." },
      { status: 500 }
    );
  }
}
