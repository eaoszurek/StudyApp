import { NextResponse } from "next/server";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { handleApiError } from "@/utils/apiHelpers";

export async function GET() {
  try {
    const context = await getAccessContext();
    if (!context.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const gate = await checkPremiumGate(context);

    return NextResponse.json({
      allowed: gate.allowed,
      isPremium: gate.hasSubscription,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
