import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function getAuthClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error("Missing Google Service Account credentials in .env");
  }

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  });
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  description: string | null;
  location: string | null;
  allDay: boolean;
}

export async function getTodayCalendarEvents(): Promise<CalendarEvent[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    throw new Error("Missing GOOGLE_CALENDAR_ID in .env");
  }

  const auth = getAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = response.data.items ?? [];

  return events.map((event) => ({
    id: event.id ?? crypto.randomUUID(),
    title: event.summary ?? "Untitled Event",
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    description: event.description ?? null,
    location: event.location ?? null,
    allDay: !event.start?.dateTime,
  }));
}
