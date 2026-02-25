import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { trpc } from "../../lib/api";

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: "#fee2e2", text: "#dc2626" },
  HIGH: { bg: "#ffedd5", text: "#c2410c" },
  NORMAL: { bg: "#dbeafe", text: "#1d4ed8" },
  LOW: { bg: "#f3f4f6", text: "#6b7280" },
};

export default function TicketsScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.tickets.list.useQuery({
    status: "OPEN",
    limit: 50,
  });

  if (selectedId) {
    return (
      <TicketDetail
        ticketId={selectedId}
        onBack={() => setSelectedId(null)}
        onRefresh={refetch}
      />
    );
  }

  const tickets = data?.tickets ?? [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ color: "#9ca3af" }}>Loading tickets...</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#374151" }}>No open tickets</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item: ticket }) => {
            const pColors = PRIORITY_COLORS[ticket.priority];
            return (
              <TouchableOpacity
                style={styles.ticketCard}
                onPress={() => setSelectedId(ticket.id)}
              >
                <View style={styles.ticketHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: pColors.bg }]}>
                    <Text style={[styles.priorityText, { color: pColors.text }]}>
                      {ticket.priority}
                    </Text>
                  </View>
                  <Text style={styles.ticketType}>
                    {ticket.type.replace("_", " ")}
                  </Text>
                </View>
                <Text style={styles.ticketTitle}>{ticket.title}</Text>
                <Text style={styles.ticketCustomer}>
                  {[ticket.customer.firstName, ticket.customer.lastName].filter(Boolean).join(" ") ||
                    ticket.customer.company}
                </Text>
                {ticket.site && (
                  <Text style={styles.ticketAddr}>{ticket.site.city}</Text>
                )}
                {ticket.assignedTo && (
                  <Text style={styles.ticketAssigned}>→ {ticket.assignedTo.name}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function TicketDetail({
  ticketId,
  onBack,
  onRefresh,
}: {
  ticketId: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { data: ticket, refetch } = trpc.tickets.byId.useQuery({ id: ticketId });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => { refetch(); onRefresh(); },
  });

  if (!ticket) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#9ca3af" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={{ color: "#2279ea", fontSize: 16 }}>← Back to Tickets</Text>
      </TouchableOpacity>

      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>{ticket.title}</Text>
        <Text style={styles.detailCustomer}>
          {[ticket.customer.firstName, ticket.customer.lastName].filter(Boolean).join(" ") ||
            ticket.customer.company}
        </Text>
        {ticket.system && (
          <Text style={styles.detailSystem}>
            {ticket.system.brand} {ticket.system.model} · #{ticket.system.serialNumber}
          </Text>
        )}
      </View>

      {ticket.description && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Description</Text>
          <Text style={styles.cardBody}>{ticket.description}</Text>
        </View>
      )}

      {/* Status update */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Update Status</Text>
        <View style={styles.statusBtns}>
          {["IN_PROGRESS", "PENDING_PARTS", "RESOLVED"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusBtn,
                ticket.status === status && styles.statusBtnActive,
              ]}
              onPress={() => updateTicket.mutate({ id: ticketId, status: status as "IN_PROGRESS" | "PENDING_PARTS" | "RESOLVED" })}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  ticket.status === status && { color: "#2279ea" },
                ]}
              >
                {status.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: "700" },
  ticketType: { fontSize: 12, color: "#9ca3af", textTransform: "capitalize" },
  ticketTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  ticketCustomer: { fontSize: 13, color: "#6b7280" },
  ticketAddr: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  ticketAssigned: { fontSize: 12, color: "#2279ea", marginTop: 4 },
  backBtn: { padding: 16 },
  detailHeader: { paddingHorizontal: 16, paddingBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  detailCustomer: { fontSize: 15, color: "#6b7280", marginTop: 4 },
  detailSystem: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, margin: 16, marginTop: 0, borderWidth: 1, borderColor: "#e5e7eb" },
  cardLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  cardBody: { fontSize: 14, color: "#374151", lineHeight: 20 },
  statusBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  statusBtnActive: { borderColor: "#2279ea", backgroundColor: "#eff8ff" },
  statusBtnText: { fontSize: 13, color: "#374151", fontWeight: "500" },
});
