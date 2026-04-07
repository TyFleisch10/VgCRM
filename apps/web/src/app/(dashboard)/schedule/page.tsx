"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  COMPLETE: "bg-green-100 text-green-700",
  INVOICED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "list">("list");

  const { data, isLoading } = trpc.jobs.list.useQuery({
    limit: 200,
  });

  const jobs = data?.jobs ?? [];

  // Get jobs for a specific date
  const getJobsForDate = (date: Date) => {
    return jobs.filter((job) => {
      if (!job.scheduledStart) return false;
      const jobDate = new Date(job.scheduledStart);
      return (
        jobDate.getFullYear() === date.getFullYear() &&
        jobDate.getMonth() === date.getMonth() &&
        jobDate.getDate() === date.getDate()
      );
    });
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get upcoming jobs sorted by date
  const upcomingJobs = jobs
    .filter((job) => job.scheduledStart)
    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 text-sm">{upcomingJobs.length} scheduled jobs</p>
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-sm ${view === "month" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            Month
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : view === "list" ? (
        // List View
        <div className="space-y-3">
          {upcomingJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No scheduled jobs</p>
              <p className="text-gray-400 text-sm mt-1">Jobs will appear here once scheduled</p>
            </div>
          ) : (
            upcomingJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-gray-400 uppercase">
                    {MONTHS[new Date(job.scheduledStart!).getMonth()].slice(0, 3)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Date(job.scheduledStart!).getDate()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(job.scheduledStart!).getFullYear()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {[job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") ||
                      job.customer.company || "—"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {job.type.replace("_", " ")} • {job.site?.city}, {job.site?.state}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {job.assignments.map((a) => a.user.name).join(", ") || "Unassigned"}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? ""}`}>
                  {job.status.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        // Month View
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700 p-1">←</button>
            <h2 className="font-semibold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700 p-1">→</button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {getCalendarDays().map((date, idx) => {
              const dayJobs = date ? getJobsForDate(date) : [];
              const isToday = date?.toDateString() === new Date().toDateString();
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1 border-b border-r border-gray-100 ${!date ? "bg-gray-50" : ""}`}
                >
                  {date && (
                    <>
                      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-brand-600 text-white" : "text-gray-700"}`}>
                        {date.getDate()}
                      </div>
                      {dayJobs.map((job) => (
                        <div key={job.id} className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-0.5 truncate">
                          {[job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") || job.customer.company}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}