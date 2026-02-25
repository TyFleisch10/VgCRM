export const PIPELINE_STAGES = [
  { key: "NEW", label: "New", color: "bg-slate-400" },
  { key: "CONTACTED", label: "Contacted", color: "bg-blue-400" },
  { key: "WATER_TEST", label: "Water Test / Diagnosis", color: "bg-cyan-500" },
  { key: "ESTIMATE_SENT", label: "Estimate Sent", color: "bg-yellow-500" },
  { key: "ESTIMATE_ACCEPTED", label: "Estimate Accepted", color: "bg-green-500" },
  { key: "SCHEDULED", label: "Scheduled", color: "bg-purple-500" },
  { key: "INSTALLED", label: "Installed", color: "bg-emerald-600" },
  { key: "BILLED", label: "Billed", color: "bg-gray-600" },
] as const;

export const LEAD_SOURCES = [
  { key: "REFERRAL", label: "Referral" },
  { key: "OWNER_NETWORK", label: "Owner Network" },
  { key: "COLD_CALL", label: "Cold Call" },
  { key: "WEBSITE", label: "Website" },
  { key: "SOCIAL_MEDIA", label: "Social Media" },
  { key: "REPEAT_CUSTOMER", label: "Repeat Customer" },
  { key: "OTHER", label: "Other" },
] as const;

export const USER_ROLES = [
  { key: "OWNER", label: "Owner / Admin" },
  { key: "OFFICE_MANAGER", label: "Office Manager" },
  { key: "RECEPTIONIST", label: "Receptionist" },
  { key: "INSTALLER", label: "Installer" },
  { key: "SERVICE_TECH", label: "Service Tech" },
] as const;

export const PRIORITIES = [
  { key: "LOW", label: "Low", color: "text-slate-500" },
  { key: "NORMAL", label: "Normal", color: "text-blue-500" },
  { key: "HIGH", label: "High", color: "text-orange-500" },
  { key: "URGENT", label: "Urgent", color: "text-red-600" },
] as const;

export const WATER_SOURCES = [
  { key: "WELL", label: "Well" },
  { key: "MUNICIPAL", label: "Municipal / City" },
  { key: "SURFACE", label: "Surface Water" },
  { key: "OTHER", label: "Other" },
] as const;

export const SYSTEM_APPLICATIONS = [
  { key: "SOFTENING", label: "Water Softening" },
  { key: "FILTRATION", label: "Filtration" },
  { key: "CHEMICAL_INJECTION", label: "Chemical Injection" },
  { key: "DISINFECTION", label: "Disinfection" },
  { key: "REVERSE_OSMOSIS", label: "Reverse Osmosis" },
  { key: "IRON_REMOVAL", label: "Iron Removal" },
  { key: "ARSENIC_REMOVAL", label: "Arsenic Removal" },
  { key: "OTHER", label: "Other" },
] as const;

export const TICKET_TYPES = [
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "REPAIR", label: "Repair" },
  { key: "EMERGENCY", label: "Emergency" },
  { key: "WARRANTY", label: "Warranty" },
  { key: "INSPECTION", label: "Inspection" },
  { key: "CHEMICAL_FILL", label: "Chemical Fill" },
] as const;

export const INVENTORY_LOCATION_TYPES = [
  { key: "STORAGE_UNIT", label: "Storage Unit" },
  { key: "GARAGE", label: "Garage" },
  { key: "TRUCK", label: "Truck" },
  { key: "TRAILER", label: "Trailer" },
  { key: "OFFICE", label: "Office" },
] as const;

export const WATER_TEST_PARAMETERS = [
  { key: "ph", label: "pH", unit: "", normal: "6.5–8.5", type: "number" },
  { key: "hardness_gpg", label: "Hardness", unit: "gpg", normal: "0–7", type: "number" },
  { key: "tds_ppm", label: "TDS", unit: "ppm", normal: "<500", type: "number" },
  { key: "iron_ppm", label: "Iron (Total)", unit: "ppm", normal: "<0.3", type: "number" },
  { key: "manganese_ppm", label: "Manganese", unit: "ppm", normal: "<0.05", type: "number" },
  { key: "chlorine_ppm", label: "Chlorine (Free)", unit: "ppm", normal: "0.5–4", type: "number" },
  { key: "nitrates_ppm", label: "Nitrates", unit: "ppm", normal: "<10", type: "number" },
  { key: "arsenic_ppb", label: "Arsenic", unit: "ppb", normal: "<10", type: "number" },
  { key: "bacteria", label: "Bacteria (Coliform)", unit: "", normal: "Absent", type: "text" },
  { key: "sulfur_ppm", label: "Sulfur / H2S", unit: "ppm", normal: "<0.05", type: "number" },
  { key: "alkalinity_ppm", label: "Alkalinity", unit: "ppm", normal: "80–200", type: "number" },
] as const;

// Permissions lookup — what each role can do
export const ROLE_PERMISSIONS = {
  OWNER: {
    canViewFinancials: true,
    canEditInvoices: true,
    canVoidInvoices: true,
    canSendInvoices: true,
    canDraftInvoiceField: true,
    canManageLeads: true,
    canCreateEstimates: true,
    canManageSchedule: true,
    canViewAllSchedule: true,
    canManageInventory: true,
    canCheckoutParts: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewAuditLog: true,
    canManageCustomers: true,
    canManageTasks: true,
    canManageTeamTasks: true,
  },
  OFFICE_MANAGER: {
    canViewFinancials: true,
    canEditInvoices: true,
    canVoidInvoices: true,
    canSendInvoices: true,
    canDraftInvoiceField: true,
    canManageLeads: true,
    canCreateEstimates: true,
    canManageSchedule: true,
    canViewAllSchedule: true,
    canManageInventory: true,
    canCheckoutParts: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: true, // view only
    canManageCustomers: true,
    canManageTasks: true,
    canManageTeamTasks: true,
  },
  RECEPTIONIST: {
    canViewFinancials: false,
    canEditInvoices: false,
    canVoidInvoices: false,
    canSendInvoices: false,
    canDraftInvoiceField: false,
    canManageLeads: true,
    canCreateEstimates: false,
    canManageSchedule: true,
    canViewAllSchedule: true,
    canManageInventory: false,
    canCheckoutParts: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: false,
    canManageCustomers: true,
    canManageTasks: true,
    canManageTeamTasks: true,
  },
  INSTALLER: {
    canViewFinancials: false,
    canEditInvoices: false,
    canVoidInvoices: false,
    canSendInvoices: false,
    canDraftInvoiceField: false,
    canManageLeads: false,
    canCreateEstimates: false,
    canManageSchedule: false,
    canViewAllSchedule: false, // own only
    canManageInventory: false,
    canCheckoutParts: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: false,
    canManageCustomers: false,
    canManageTasks: true, // own only
    canManageTeamTasks: false,
  },
  SERVICE_TECH: {
    canViewFinancials: false,
    canEditInvoices: false,
    canVoidInvoices: false,
    canSendInvoices: false,
    canDraftInvoiceField: true, // draft only
    canManageLeads: false,
    canCreateEstimates: false,
    canManageSchedule: false,
    canViewAllSchedule: false, // own only
    canManageInventory: false,
    canCheckoutParts: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: false,
    canManageCustomers: false,
    canManageTasks: true, // own only
    canManageTeamTasks: false,
  },
} as const;

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  STAGE_CHANGE: "STAGE_CHANGE",
  ESTIMATE_SENT: "ESTIMATE_SENT",
  ESTIMATE_ACCEPTED: "ESTIMATE_ACCEPTED",
  INVOICE_CREATED: "INVOICE_CREATED",
  INVOICE_VOIDED: "INVOICE_VOIDED",
  INVENTORY_ADJUST: "INVENTORY_ADJUST",
  PERMISSION_CHANGE: "PERMISSION_CHANGE",
  LOGIN: "LOGIN",
  QBO_SYNC: "QBO_SYNC",
} as const;
