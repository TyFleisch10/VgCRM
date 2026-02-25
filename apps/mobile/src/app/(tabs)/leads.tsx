/**
 * Quick Lead Capture — field-first mobile screen
 * Techs and office staff can capture a new lead in under 30 seconds.
 */
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { trpc } from "../../lib/api";
import { isOnline, enqueueAction } from "../../lib/offline";

const SOURCES = [
  { key: "REFERRAL", label: "Referral" },
  { key: "OWNER_NETWORK", label: "Owner Network" },
  { key: "COLD_CALL", label: "Cold Call" },
  { key: "WEBSITE", label: "Website" },
  { key: "OTHER", label: "Other" },
];

const TYPES = [
  { key: "RESIDENTIAL", label: "Residential" },
  { key: "COMMERCIAL", label: "Commercial" },
  { key: "MUNICIPAL", label: "Municipal" },
];

export default function NewLeadScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerType, setCustomerType] = useState("RESIDENTIAL");
  const [source, setSource] = useState("REFERRAL");
  const [referredBy, setReferredBy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createLead = trpc.leads.create.useMutation();

  async function handleSubmit() {
    if (!firstName.trim() && !lastName.trim()) {
      Alert.alert("Required", "Please enter at least a first or last name.");
      return;
    }

    const payload = {
      newCustomer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phonePrimary: phone.trim() || undefined,
        type: customerType as "RESIDENTIAL" | "COMMERCIAL" | "MUNICIPAL",
      },
      source: source as "REFERRAL" | "OWNER_NETWORK" | "COLD_CALL" | "WEBSITE" | "OTHER",
      notes: notes.trim() || undefined,
    };

    const online = await isOnline();

    if (!online) {
      enqueueAction("createLead", payload);
      setSubmitted(true);
      Alert.alert(
        "Saved Offline",
        "Lead saved locally and will sync when you're back online."
      );
      return;
    }

    try {
      await createLead.mutateAsync(payload);
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Error", "Failed to save lead. Please try again.");
      console.error(err);
    }
  }

  function handleReset() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setCustomerType("RESIDENTIAL");
    setSource("REFERRAL");
    setReferredBy("");
    setNotes("");
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Lead Captured!</Text>
        <Text style={styles.successSub}>
          {firstName} {lastName} has been added to the pipeline.
        </Text>
        <TouchableOpacity style={styles.addAnother} onPress={handleReset}>
          <Text style={styles.addAnotherText}>Add Another Lead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.sectionLabel}>Contact</Text>

        <View style={styles.row}>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 000-0000"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Customer Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.chip, customerType === t.key && styles.chipActive]}
              onPress={() => setCustomerType(t.key)}
            >
              <Text style={[styles.chipText, customerType === t.key && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Lead Source</Text>
        <View style={styles.chipRow}>
          {SOURCES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, source === s.key && styles.chipActive]}
              onPress={() => setSource(s.key)}
            >
              <Text style={[styles.chipText, source === s.key && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {source === "REFERRAL" && (
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Referred By</Text>
            <TextInput
              style={styles.input}
              value={referredBy}
              onChangeText={setReferredBy}
              placeholder="Name of referral source"
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional context..."
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createLead.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={createLead.isPending}
        >
          {createLead.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Lead</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  form: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 12 },
  inputWrap: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  textarea: { height: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#2279ea", borderColor: "#2279ea" },
  chipText: { fontSize: 14, color: "#374151" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#2279ea",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  successContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  successSub: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  addAnother: {
    backgroundColor: "#2279ea",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  addAnotherText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
