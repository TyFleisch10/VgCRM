import { NextResponse } from "next/server";
import { getTodayCalendarEvents } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await getTodayCalendarEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Google Calendar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
