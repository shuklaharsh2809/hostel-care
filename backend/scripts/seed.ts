try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on the real environment
}

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const FIRST = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan", "Kabir",
  "Ananya", "Diya", "Saanvi", "Aadhya", "Kavya", "Isha", "Meera", "Riya", "Priya", "Nisha", "Tanvi", "Pooja"];
const LAST = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Reddy", "Iyer", "Nair", "Joshi", "Mehta", "Rao", "Das"];
const COLLEGES = ["City Engineering College", "St. Xavier's College", "National Institute of Design", "Govt. Medical College", "Commerce & Arts College"];
const COURSES = ["B.Tech CSE", "B.Com", "MBBS", "B.Des", "BBA", "B.Sc Physics", "M.Tech"];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length]!;
}

async function main() {
  const { db } = await import("../src/db/index.js");
  const s = await import("../src/db/schema.js");
  const { createInvoice, refreshInvoicePaymentStatus } = await import("../src/lib/billing.js");

  const email = "demo@hostelcare.app";
  const existing = await db.select().from(s.users).where(eq(s.users.email, email));
  if (existing.length) {
    console.log("Demo data already present. Login: demo@hostelcare.app / demo1234");
    process.exit(0);
  }

  const [org] = await db
    .insert(s.organizations)
    .values({
      name: "Sunrise Hostels",
      email: "accounts@sunrisehostels.in",
      phone: "+91 98765 43210",
      address: "12 MG Road, Pune, Maharashtra 411001",
      gstin: "27ABCDE1234F1Z5",
      invoicePrefix: "SUN",
    })
    .returning();

  const branchData = [
    { name: "Sunrise Boys – Kothrud", code: "KTH", city: "Pune", address: "45 Paud Road, Kothrud", wardenName: "Mr. Rajesh Kulkarni", hasMess: true },
    { name: "Sunrise Girls – Viman Nagar", code: "VMN", city: "Pune", address: "8 Airport Road, Viman Nagar", wardenName: "Mrs. Sunita Deshpande", hasMess: true },
    { name: "Sunrise Studio – Hinjewadi", code: "HJW", city: "Pune", address: "Phase 1, Hinjewadi", wardenName: "Mr. Amit Pawar", hasMess: false },
  ];
  const branches = await db
    .insert(s.branches)
    .values(branchData.map((b) => ({ ...b, orgId: org!.id, phone: "+91 90000 0000" + b.code.length })))
    .returning();

  await db.insert(s.users).values({
    orgId: org!.id,
    name: "Harsh (Owner)",
    email,
    passwordHash: await bcrypt.hash("demo1234", 10),
    role: "owner",
  });

  const menu = [
    ["Poha, Tea", "Dal, Rice, Roti, Aloo Gobi", "Samosa", "Paneer Butter Masala, Roti, Rice"],
    ["Idli Sambar", "Rajma Chawal, Salad", "Biscuits, Tea", "Mix Veg, Dal Tadka, Roti"],
    ["Upma, Banana", "Chole, Rice, Puri", "Bhel", "Egg Curry / Kadhai Paneer, Roti"],
    ["Paratha, Curd", "Kadhi Chawal, Papad", "Pakode", "Veg Pulao, Raita"],
    ["Dosa, Chutney", "Dal Makhani, Jeera Rice", "Sandwich", "Bhindi Masala, Roti, Dal"],
    ["Bread Omelette / Butter", "Veg Biryani, Raita", "Vada Pav", "Chicken Curry / Malai Kofta, Roti"],
    ["Chole Bhature", "Special Thali", "Tea, Cookies", "Khichdi, Kadhi, Papad"],
  ];

  let studentCounter = 0;
  for (const branch of branches) {
    // Rooms
    const roomRows = [];
    for (let floor = 1; floor <= 3; floor++) {
      for (let r = 1; r <= 4; r++) {
        const capacity = r === 1 ? 1 : r === 4 ? 3 : 2;
        roomRows.push({
          orgId: org!.id,
          branchId: branch.id,
          number: `${floor}0${r}`,
          floor: `Floor ${floor}`,
          roomType: capacity === 1 ? "single" : capacity === 2 ? "double" : "triple",
          capacity,
          monthlyRent: (capacity === 1 ? 9000 : capacity === 2 ? 7000 : 5500) * 100,
        });
      }
    }
    const rooms = await db.insert(s.rooms).values(roomRows).returning();

    // Mess
    let plans: (typeof s.messPlans.$inferSelect)[] = [];
    if (branch.hasMess) {
      plans = await db
        .insert(s.messPlans)
        .values([
          { orgId: org!.id, branchId: branch.id, name: "Full Board (3 meals)", description: "Breakfast, lunch, dinner + evening snacks", monthlyFee: 4500_00 },
          { orgId: org!.id, branchId: branch.id, name: "Two Meals", description: "Lunch and dinner", monthlyFee: 3200_00 },
        ])
        .returning();
      await db.insert(s.messMenus).values(
        menu.map((m, day) => ({
          orgId: org!.id,
          branchId: branch.id,
          dayOfWeek: day,
          breakfast: m[0],
          lunch: m[1],
          snacks: m[2],
          dinner: m[3],
        })),
      );
      const cats = ["Groceries", "Vegetables", "Milk & Dairy", "Gas Cylinder", "Staff Salary"];
      const today = new Date();
      await db.insert(s.messExpenses).values(
        Array.from({ length: 14 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - i * 3);
          return {
            orgId: org!.id,
            branchId: branch.id,
            spentOn: d.toISOString().slice(0, 10),
            category: pick(cats, i),
            description: `${pick(cats, i)} purchase`,
            amount: (1500 + ((i * 937) % 6000)) * 100,
          };
        }),
      );
    }

    // Students: fill most beds
    const female = branch.code === "VMN";
    for (const room of rooms) {
      const occupants = Math.max(0, room.capacity - (studentCounter % 5 === 0 ? 1 : 0));
      for (let k = 0; k < occupants; k++) {
        const i = studentCounter++;
        const first = female ? pick(FIRST.slice(10), i) : pick(FIRST.slice(0, 10), i);
        const last = pick(LAST, i * 7);
        const plan = plans.length ? (i % 4 === 0 ? null : pick(plans, i)) : null;
        const joinMonthsAgo = 1 + (i % 10);
        const join = new Date();
        join.setMonth(join.getMonth() - joinMonthsAgo);
        const [student] = await db
          .insert(s.students)
          .values({
            orgId: org!.id,
            branchId: branch.id,
            roomId: room.id,
            messPlanId: plan?.id ?? null,
            fullName: `${first} ${last}`,
            gender: female ? "female" : i % 6 === 0 && branch.code === "HJW" ? "female" : "male",
            dateOfBirth: `200${3 + (i % 4)}-0${1 + (i % 9)}-1${i % 9}`,
            phone: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
            email: `${first}.${last}${i}@example.com`.toLowerCase(),
            bloodGroup: pick(["A+", "B+", "O+", "AB+", "O-", "B-"], i),
            institution: pick(COLLEGES, i),
            course: pick(COURSES, i * 3),
            permanentAddress: `${10 + i}, ${pick(["Nagpur", "Nashik", "Indore", "Jaipur", "Surat", "Raipur"], i)}`,
            idProofType: "Aadhaar",
            idProofNumber: `XXXX XXXX ${String(1000 + i * 37).slice(-4)}`,
            guardianName: `${pick(["Ramesh", "Suresh", "Mahesh", "Anil", "Vijay"], i)} ${last}`,
            guardianRelation: "Father",
            guardianPhone: `+91 9${String(700000000 + i * 7654321).slice(0, 9)}`,
            joinDate: join.toISOString().slice(0, 10),
            monthlyRent: room.monthlyRent,
            securityDeposit: room.monthlyRent,
          })
          .returning();

        // Two months of invoices: last month (mostly paid), this month (mixed)
        for (const monthsAgo of [1, 0]) {
          const d = new Date();
          d.setMonth(d.getMonth() - monthsAgo, 1);
          const issue = d.toISOString().slice(0, 10);
          const due = new Date(d);
          due.setDate(10);
          const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
          const items = [{ description: `Room rent – ${label} (Room ${room.number})`, quantity: 1, unitPrice: room.monthlyRent }];
          if (plan) items.push({ description: `Mess – ${plan.name} – ${label}`, quantity: 1, unitPrice: plan.monthlyFee });
          await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
            const inv = await createInvoice(tx, {
              orgId: org!.id,
              branchId: branch.id,
              studentId: student!.id,
              items,
              issueDate: issue,
              dueDate: due.toISOString().slice(0, 10),
              periodLabel: label,
            });
            const payMode = monthsAgo === 1 ? (i % 7 === 0 ? "partial" : "full") : i % 3 === 0 ? "full" : i % 3 === 1 ? "partial" : "none";
            if (payMode !== "none") {
              await tx.insert(s.payments).values({
                orgId: org!.id,
                invoiceId: inv.id,
                amount: payMode === "full" ? inv.total : Math.round(inv.total / 2),
                method: pick(["upi", "cash", "bank_transfer"] as const, i),
                reference: `TXN${100000 + i * 13 + monthsAgo}`,
                paidOn: issue,
              });
              await refreshInvoicePaymentStatus(tx, org!.id, inv.id);
            }
          });
        }
      }
    }
  }

  console.log(`✓ Seeded "Sunrise Hostels" with ${branches.length} branches and ${studentCounter} students`);
  console.log("  Login: demo@hostelcare.app / demo1234");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
