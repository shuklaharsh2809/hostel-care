/** Shapes returned by the HostelCare API (backend/). Money is integer paise; dates are YYYY-MM-DD strings. */

export type Role = "owner" | "manager" | "staff";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "void";
export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "cheque";

export type User = { id: string; name: string; email: string; role: Role; branchId: string | null; orgId: string; orgName: string };

export type Organization = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  invoicePrefix: string;
  nextInvoiceNumber?: number;
  defaultTaxPercent: number;
};

export type Branch = {
  id: string;
  orgId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  wardenName: string | null;
  hasMess: boolean;
};
export type BranchWithCounts = Branch & { rooms: number; beds: number; students: number };

export type Room = {
  id: string;
  branchId: string;
  number: string;
  floor: string | null;
  roomType: string;
  capacity: number;
  monthlyRent: number;
};
export type RoomWithOccupants = Room & { occupants: { id: string; name: string }[] };

export type Student = {
  id: string;
  branchId: string;
  roomId: string | null;
  messPlanId: string | null;
  status: "active" | "left";
  fullName: string;
  gender: "male" | "female" | "other" | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  institution: string | null;
  course: string | null;
  permanentAddress: string | null;
  idProofType: string | null;
  idProofNumber: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  joinDate: string;
  leaveDate: string | null;
  monthlyRent: number;
  securityDeposit: number;
  notes: string | null;
};

export type MessPlan = { id: string; branchId: string; name: string; description: string | null; monthlyFee: number; active: boolean };

export type Invoice = {
  id: string;
  branchId: string;
  studentId: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  periodLabel: string | null;
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string | null;
};

export type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: number; amount: number };
export type Payment = { id: string; invoiceId: string; amount: number; method: PaymentMethod; reference: string | null; paidOn: string };

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };

export type Dashboard = {
  totals: {
    branches: number;
    students: number;
    beds: number;
    occupancyPct: number;
    collectedThisMonth: number;
    messSpendThisMonth: number;
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
  };
  branches: { id: string; name: string; code: string; city: string | null; students: number; beds: number; dues: number }[];
  recentInvoices: { id: string; number: string; total: number; status: InvoiceStatus; issueDate: string; studentName: string }[];
};

export type StudentListRow = {
  id: string;
  fullName: string;
  phone: string | null;
  institution: string | null;
  course: string | null;
  status: "active" | "left";
  joinDate: string;
  branchName: string;
  branchCode: string;
  roomNumber: string | null;
  messPlan: string | null;
  dues: number;
};

export type StudentFormOptions = {
  branches: { id: string; name: string }[];
  rooms: { id: string; branchId: string; number: string; capacity: number; occupied: number; monthlyRent: number }[];
  plans: { id: string; branchId: string; name: string; monthlyFee: number }[];
};

export type StudentDetail = { student: Student; branch: Branch; room: Room | null; plan: MessPlan | null; invoices: Invoice[] };

export type MessOverview =
  | { branches: []; branch: null }
  | {
      branches: { id: string; name: string }[];
      branch: { id: string; name: string };
      month: string;
      prevMonth: string;
      nextMonth: string;
      menu: { dayOfWeek: number; breakfast: string | null; lunch: string | null; snacks: string | null; dinner: string | null }[];
      plans: (MessPlan & { subscribers: number })[];
      expenses: { id: string; spentOn: string; category: string; description: string | null; amount: number }[];
      summary: { subscribers: number; expectedIncome: number; spent: number; net: number };
    };

export type InvoiceListRow = Invoice & { studentName: string; branchCode: string };
export type InvoiceList = Paged<InvoiceListRow> & { summary: { billed: number; collected: number; outstanding: number; overdue: number } };

export type InvoiceDetail = {
  invoice: Invoice;
  student: Student;
  branch: Branch;
  organization: Organization;
  roomNumber: string | null;
  items: InvoiceItem[];
  payments: Payment[];
};

export type InvoiceStudentOption = {
  id: string;
  fullName: string;
  branchName: string;
  roomNumber: string | null;
  monthlyRent: number;
  planName: string | null;
  planFee: number | null;
};

export type TeamMember = { id: string; name: string; email: string; role: Role; branchId: string | null; branchName: string | null };
