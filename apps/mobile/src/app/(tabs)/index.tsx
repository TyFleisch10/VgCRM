import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { trpc } from "../../lib/api";

export default function MobileDashboard() {
  const { data: summary } = trpc.dashboard.summary.useQuery();
  const { data: todayJobs } = trpc.jobs.todaySchedule.useQuery();

  return (
    <ScrollView style={styles.container}>
      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KpiCard label="Active Leads" value={String(summary?.pipeline.activeLeads ?? "—")} color="#eff8ff" textColor="#2279ea" />
        <KpiCard label="Today's Jobs" value={String(summary?.todayJobs ?? "—")} color="#f5f0ff" textColor="#7c3aed" />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard label="Open Tickets" value={String((summary?.tickets.open ?? 0) + (summary?.tickets.inProgress ?? 0))} color="#fff7ed" textColor="#c2410c" />
        <KpiCard label="Low Stock" value={String(summary?.lowStockItems ?? "—")} color="#f0fdf4" textColor="#16a34a" />
      </View>

      {/* Today's schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
        {!todayJobs?.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No jobs scheduled today</Text>
          </View>
        ) : (
          todayJobs.map((job) => (
            <TouchableOpacity key={job.id} style={styles.jobCard}>
              <View style={styles.jobRow}>
                <Text style={styles.jobTime}>
                  {job.scheduledStart
                    ? new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                    : "—"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobName}>
                    {[job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") || job.customer.company}
                  </Text>
                  <Text style={styles.jobAddr}>{job.site?.city}</Text>
                </View>
                <Text style={styles.jobTech}>
                  {job.assignments.map((a) => a.user.name.split(" ")[0]).join(", ")}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function KpiCard({ label, value, color, textColor }: { label: string; value: string; color: string; textColor: string }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: color }]}>
      <Text style={[styles.kpiValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: textColor + "cc" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 16 },
  kpiValue: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: "500" },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  jobCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  jobTime: { fontSize: 13, fontWeight: "600", color: "#2279ea", width: 56 },
  jobName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  jobAddr: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  jobTech: { fontSize: 12, color: "#6b7280" },
});
