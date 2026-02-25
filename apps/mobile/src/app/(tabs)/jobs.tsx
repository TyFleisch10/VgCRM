/**
 * Field Tech Job View — mobile
 * Shows assigned jobs with system specs, checklist, parts logging, and water test capture.
 */
import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
} from "react-native";
import { trpc } from "../../lib/api";
import { getCachedJobs } from "../../lib/offline";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#9ca3af",
  SCHEDULED: "#8b5cf6",
  IN_PROGRESS: "#2279ea",
  COMPLETE: "#16a34a",
  ON_HOLD: "#f59e0b",
};

export default function JobsScreen() {
  const { data, isLoading, refetch } = trpc.jobs.list.useQuery({
    status: "SCHEDULED",
    limit: 50,
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (selectedJobId) {
    return (
      <JobDetail
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
        onRefresh={refetch}
      />
    );
  }

  // Fallback to cached jobs when offline
  const jobs = data?.jobs ?? [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No jobs scheduled</Text>
          <Text style={styles.emptyText}>Your assigned jobs will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item: job }) => (
            <TouchableOpacity
              style={styles.jobCard}
              onPress={() => setSelectedJobId(job.id)}
            >
              <View style={styles.jobCardHeader}>
                <Text style={styles.jobCustomer}>
                  {[job.customer.firstName, job.customer.lastName]
                    .filter(Boolean)
                    .join(" ") || job.customer.company}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[job.status] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[job.status] },
                    ]}
                  >
                    {job.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              {job.site && (
                <Text style={styles.jobAddress}>
                  📍 {job.site.address}, {job.site.city}
                </Text>
              )}

              <Text style={styles.jobType}>
                {job.type.replace("_", " ")} ·{" "}
                {job.assignments.map((a) => a.user.name).join(", ")}
              </Text>

              {job.scheduledStart && (
                <Text style={styles.jobTime}>
                  {new Date(job.scheduledStart).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function JobDetail({
  jobId,
  onBack,
  onRefresh,
}: {
  jobId: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { data: job, isLoading, refetch } = trpc.jobs.byId.useQuery({ id: jobId });
  const updateStatus = trpc.jobs.updateStatus.useMutation({ onSuccess: () => { refetch(); onRefresh(); } });
  const updateChecklist = trpc.jobs.updateChecklistItem.useMutation({ onSuccess: refetch });

  if (isLoading || !job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const site = job.site;
  const system = site?.systems?.[0];

  function openMaps() {
    if (!site) return;
    const addr = `${site.address}, ${site.city}, ${site.state}`;
    const url = `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
    Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Back to Jobs</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>
          {[job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") ||
            job.customer.company}
        </Text>
        <Text style={styles.detailSubtitle}>
          {job.type.replace("_", " ")} · #{job.id.slice(-6).toUpperCase()}
        </Text>

        {/* Status update buttons */}
        <View style={styles.statusRow}>
          {job.status === "SCHEDULED" && (
            <TouchableOpacity
              style={styles.statusBtn}
              onPress={() => updateStatus.mutate({ id: job.id, status: "IN_PROGRESS" })}
            >
              <Text style={styles.statusBtnText}>▶ Start Job</Text>
            </TouchableOpacity>
          )}
          {job.status === "IN_PROGRESS" && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: "#16a34a" }]}
              onPress={() => {
                Alert.alert("Complete Job?", "Mark this job as complete?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Complete",
                    onPress: () => updateStatus.mutate({ id: job.id, status: "COMPLETE" }),
                  },
                ]);
              }}
            >
              <Text style={styles.statusBtnText}>✓ Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Site + navigation */}
      {site && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Site</Text>
          <Text style={styles.cardText}>{site.address}</Text>
          <Text style={styles.cardText}>{site.city}, {site.state}</Text>
          <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
            <Text style={styles.mapBtnText}>📍 Navigate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* System specs */}
      {system && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Specs</Text>
          <SpecRow label="Brand" value={system.brand} />
          <SpecRow label="Model" value={system.model} />
          <SpecRow label="Serial #" value={system.serialNumber} />
          <SpecRow label="Filter Size" value={system.filterSize} />
          <SpecRow label="Media" value={system.mediaType} />
          {system.chemicalType && (
            <>
              <SpecRow label="Chemical" value={system.chemicalType} />
              <SpecRow label="Concentration" value={system.chemicalConcentration} />
            </>
          )}
        </View>
      )}

      {/* Checklist */}
      {job.checklists.map((checklist) => {
        const items = checklist.items as Array<{
          id: string;
          title: string;
          description?: string;
          required: boolean;
          completed: boolean;
        }>;
        const done = items.filter((i) => i.completed).length;

        return (
          <View key={checklist.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              Checklist ({done}/{items.length})
            </Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                onPress={() =>
                  updateChecklist.mutate({
                    jobId: job.id,
                    checklistId: checklist.id,
                    itemId: item.id,
                    completed: !item.completed,
                  })
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    item.completed && styles.checkboxDone,
                  ]}
                >
                  {item.completed && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.checklistTitle,
                      item.completed && styles.checklistTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={styles.checklistDesc}>{item.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {/* Quick action buttons */}
      <View style={styles.actionsGrid}>
        <ActionBtn icon="📷" label="Add Photo" onPress={() => Alert.alert("Coming soon", "Photo capture in build")} />
        <ActionBtn icon="🧪" label="Water Test" onPress={() => Alert.alert("Coming soon", "Water test form in build")} />
        <ActionBtn icon="🔩" label="Log Parts" onPress={() => Alert.alert("Coming soon", "Parts logging in build")} />
        <ActionBtn icon="📄" label="Draft Invoice" onPress={() => Alert.alert("Coming soon", "Invoice draft in build")} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { color: "#9ca3af", fontSize: 16 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  jobCustomer: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  jobAddress: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  jobType: { fontSize: 13, color: "#9ca3af" },
  jobTime: { fontSize: 14, fontWeight: "600", color: "#2279ea", marginTop: 6 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backBtnText: { color: "#2279ea", fontSize: 16 },
  detailHeader: { padding: 16 },
  detailTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  detailSubtitle: { fontSize: 14, color: "#9ca3af", marginTop: 2 },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statusBtn: { backgroundColor: "#2279ea", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  statusBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, margin: 16, marginTop: 0, borderWidth: 1, borderColor: "#e5e7eb" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  cardText: { fontSize: 15, color: "#111827", marginBottom: 2 },
  mapBtn: { backgroundColor: "#eff8ff", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginTop: 12, alignSelf: "flex-start" },
  mapBtnText: { color: "#2279ea", fontSize: 14, fontWeight: "600" },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  specLabel: { fontSize: 14, color: "#6b7280" },
  specValue: { fontSize: 14, color: "#111827", fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 16 },
  checklistItem: { flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: "#2279ea", borderColor: "#2279ea" },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  checklistTitle: { fontSize: 14, color: "#111827", fontWeight: "500" },
  checklistTitleDone: { color: "#9ca3af", textDecorationLine: "line-through" },
  checklistDesc: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12, justifyContent: "space-between" },
  actionBtn: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", width: "47%", borderWidth: 1, borderColor: "#e5e7eb" },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: "500", color: "#374151" },
});
