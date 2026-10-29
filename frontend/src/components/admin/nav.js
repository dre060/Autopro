// frontend/src/components/admin/nav.js
import {
  LayoutDashboard, Wrench, CalendarDays, Receipt, Users, CarFront, Package, ClipboardList,
  MessageSquare, Star, BarChart3, Settings, BookOpen, Wallet, Landmark, BookText, CalendarCheck,
  UserCog, Timer, Route, Handshake,
} from "lucide-react";

// roles: who sees the item. Default: owner + manager.
const ALL = ["owner", "manager", "bookkeeper", "technician"];
const BOOKS = ["owner", "manager", "bookkeeper"];

export const NAV = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true, roles: BOOKS }],
  },
  {
    label: "Shop",
    items: [
      { label: "Repair orders", href: "/admin/repair-orders", icon: Wrench, badge: "readyForPickup" },
      { label: "Schedule", href: "/admin/schedule", icon: CalendarDays, badge: "pendingAppointments" },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Time clock & my jobs", href: "/admin/tech", icon: Timer, roles: ALL },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Expenses & bills", href: "/admin/expenses", icon: Wallet, badge: "billsDue" },
      { label: "Florida & income taxes", href: "/admin/taxes", icon: Landmark, roles: BOOKS },
      { label: "Reports", href: "/admin/reports", icon: BarChart3, roles: BOOKS },
      { label: "Books & ledger", href: "/admin/books", icon: BookText, roles: BOOKS },
      { label: "Year-end & 1099s", href: "/admin/year-end", icon: CalendarCheck, roles: BOOKS },
      { label: "QuickBooks export", href: "/admin/exports", icon: BookOpen, roles: BOOKS },
    ],
  },
  {
    label: "Vehicles & parts",
    items: [
      { label: "Cars for sale", href: "/admin/inventory", icon: CarFront },
      { label: "Vehicle sales", href: "/admin/deals", icon: Handshake },
      { label: "Parts", href: "/admin/parts", icon: Package },
      { label: "Services & pricing", href: "/admin/services", icon: ClipboardList },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Team & payroll", href: "/admin/team", icon: UserCog },
      { label: "Mileage", href: "/admin/mileage", icon: Route },
      { label: "Messages", href: "/admin/messages", icon: MessageSquare, badge: "unreadMessages" },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const canSee = (item, role) => (item.roles || ["owner", "manager"]).includes(role);
export const navFor = (role) =>
  NAV.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i, role)) })).filter((g) => g.items.length);

// First page a role lands on.
export const homeFor = (role) => (role === "technician" ? "/admin/tech" : "/admin");
