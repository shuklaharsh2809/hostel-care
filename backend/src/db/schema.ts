import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Multi-tenant model: every business table carries `orgId`.
 * All queries in the app are scoped by the orgId of the signed-in user.
 * Money is stored as integer paise (₹1 = 100) to avoid floating point errors.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const orgRef = () =>
  uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["owner", "manager", "staff"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const studentStatusEnum = pgEnum("student_status", ["active", "left"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "void",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "upi", "bank_transfer", "card", "cheque"]);

// ---------- Tenancy ----------

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  gstin: text("gstin"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  defaultTaxPercent: smallint("default_tax_percent").notNull().default(0),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    orgId: orgRef(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("manager"),
    // Managers/staff can optionally be limited to a single branch
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const branches = pgTable(
  "branches",
  {
    id: id(),
    orgId: orgRef(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    city: text("city"),
    phone: text("phone"),
    wardenName: text("warden_name"),
    hasMess: boolean("has_mess").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("branches_org_code_uq").on(t.orgId, t.code)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: id(),
    orgId: orgRef(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    floor: text("floor"),
    roomType: text("room_type").notNull().default("shared"),
    capacity: smallint("capacity").notNull().default(2),
    monthlyRent: integer("monthly_rent").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("rooms_branch_number_uq").on(t.branchId, t.number)],
);

// ---------- Students ----------

export const students = pgTable(
  "students",
  {
    id: id(),
    orgId: orgRef(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    messPlanId: uuid("mess_plan_id").references(() => messPlans.id, { onDelete: "set null" }),
    status: studentStatusEnum("status").notNull().default("active"),

    fullName: text("full_name").notNull(),
    gender: genderEnum("gender"),
    dateOfBirth: date("date_of_birth"),
    phone: text("phone"),
    email: text("email"),
    bloodGroup: text("blood_group"),
    photoUrl: text("photo_url"),

    institution: text("institution"),
    course: text("course"),

    permanentAddress: text("permanent_address"),
    idProofType: text("id_proof_type"),
    idProofNumber: text("id_proof_number"),

    guardianName: text("guardian_name"),
    guardianRelation: text("guardian_relation"),
    guardianPhone: text("guardian_phone"),

    joinDate: date("join_date").notNull().default(sql`CURRENT_DATE`),
    leaveDate: date("leave_date"),
    monthlyRent: integer("monthly_rent").notNull().default(0),
    securityDeposit: integer("security_deposit").notNull().default(0),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("students_org_branch_idx").on(t.orgId, t.branchId)],
);

// ---------- Mess ----------

export const messPlans = pgTable("mess_plans", {
  id: id(),
  orgId: orgRef(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  monthlyFee: integer("monthly_fee").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const messMenus = pgTable(
  "mess_menus",
  {
    id: id(),
    orgId: orgRef(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 0 = Monday … 6 = Sunday
    breakfast: text("breakfast"),
    lunch: text("lunch"),
    snacks: text("snacks"),
    dinner: text("dinner"),
  },
  (t) => [uniqueIndex("mess_menus_branch_day_uq").on(t.branchId, t.dayOfWeek)],
);

export const messExpenses = pgTable(
  "mess_expenses",
  {
    id: id(),
    orgId: orgRef(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    spentOn: date("spent_on").notNull().default(sql`CURRENT_DATE`),
    category: text("category").notNull(),
    description: text("description"),
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("mess_expenses_branch_date_idx").on(t.branchId, t.spentOn)],
);

// ---------- Billing ----------

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    orgId: orgRef(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    number: text("number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("issued"),
    issueDate: date("issue_date").notNull().default(sql`CURRENT_DATE`),
    dueDate: date("due_date"),
    periodLabel: text("period_label"),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    taxPercent: smallint("tax_percent").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    total: integer("total").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invoices_org_number_uq").on(t.orgId, t.number),
    index("invoices_org_status_idx").on(t.orgId, t.status),
  ],
);

export const invoiceItems = pgTable("invoice_items", {
  id: id(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  amount: integer("amount").notNull(),
  position: smallint("position").notNull().default(0),
});

export const payments = pgTable("payments", {
  id: id(),
  orgId: orgRef(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  reference: text("reference"),
  paidOn: date("paid_on").notNull().default(sql`CURRENT_DATE`),
  createdAt: createdAt(),
});

// ---------- Relations ----------

export const branchRelations = relations(branches, ({ many }) => ({
  rooms: many(rooms),
  students: many(students),
}));

export const roomRelations = relations(rooms, ({ one, many }) => ({
  branch: one(branches, { fields: [rooms.branchId], references: [branches.id] }),
  students: many(students),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
  branch: one(branches, { fields: [students.branchId], references: [branches.id] }),
  room: one(rooms, { fields: [students.roomId], references: [rooms.id] }),
  messPlan: one(messPlans, { fields: [students.messPlanId], references: [messPlans.id] }),
  invoices: many(invoices),
}));

export const invoiceRelations = relations(invoices, ({ one, many }) => ({
  student: one(students, { fields: [invoices.studentId], references: [students.id] }),
  branch: one(branches, { fields: [invoices.branchId], references: [branches.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Student = typeof students.$inferSelect;
export type MessPlan = typeof messPlans.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
