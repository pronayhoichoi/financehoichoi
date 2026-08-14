import type { Role } from "@/app/generated/prisma/client";

/**
 * Encodes Sheet 4 "Module Access Matrix" verbatim so every module checks
 * permissions against this one table instead of scattering role checks
 * across routes/components.
 *
 * Legend (matches the source spreadsheet): E = Edit/create, A = Approve,
 * V = View only, S = Submit own data, - = No access.
 */
export type AccessLevel = "E" | "A" | "V" | "S" | "-";

export const MODULES = [
  "VENDOR_MASTER",
  "VRF",
  "PROJECT",
  "SCRIPT_BREAKDOWN",
  "SCHEDULE",
  "LOCATIONS",
  "CREW",
  "CALL_SHEETS",
  "PO",
  "PRODUCTION_BUDGET",
  "DEPT_BUDGET",
  "PAYMENTS",
  "DEFERMENT",
  "RECONCILIATION",
  "TIMESHEETS",
  "AMORTIZATION",
  "MIS_CASHFLOW",
  "ANALYTICS",
] as const;

export type ModuleKey = (typeof MODULES)[number];

// Row order/values transcribed directly from Sheet 4's Module Access Matrix.
const ACCESS_MATRIX: Record<Role, Record<ModuleKey, AccessLevel>> = {
  FINANCE_TEAM: {
    VENDOR_MASTER: "E",
    VRF: "E",
    PROJECT: "E",
    SCRIPT_BREAKDOWN: "V",
    SCHEDULE: "V",
    LOCATIONS: "V",
    CREW: "V",
    CALL_SHEETS: "V",
    PO: "E",
    PRODUCTION_BUDGET: "V",
    DEPT_BUDGET: "V",
    PAYMENTS: "E",
    DEFERMENT: "V",
    RECONCILIATION: "E",
    TIMESHEETS: "V",
    AMORTIZATION: "E",
    MIS_CASHFLOW: "V",
    ANALYTICS: "V",
  },
  FINANCE_HEAD_CFO: {
    VENDOR_MASTER: "E",
    VRF: "A",
    PROJECT: "A",
    SCRIPT_BREAKDOWN: "V",
    SCHEDULE: "V",
    LOCATIONS: "V",
    CREW: "V",
    CALL_SHEETS: "V",
    PO: "A",
    PRODUCTION_BUDGET: "A",
    DEPT_BUDGET: "A",
    PAYMENTS: "A",
    DEFERMENT: "A",
    RECONCILIATION: "E",
    TIMESHEETS: "V",
    AMORTIZATION: "A",
    MIS_CASHFLOW: "E",
    ANALYTICS: "V",
  },
  FOUNDER_CEO: {
    VENDOR_MASTER: "V",
    VRF: "V",
    PROJECT: "V",
    SCRIPT_BREAKDOWN: "V",
    SCHEDULE: "V",
    LOCATIONS: "V",
    CREW: "V",
    CALL_SHEETS: "V",
    PO: "V",
    PRODUCTION_BUDGET: "V",
    DEPT_BUDGET: "V",
    PAYMENTS: "A",
    DEFERMENT: "A",
    RECONCILIATION: "V",
    TIMESHEETS: "V",
    AMORTIZATION: "V",
    MIS_CASHFLOW: "V",
    ANALYTICS: "V",
  },
  PRODUCTION_MANAGER: {
    VENDOR_MASTER: "V",
    VRF: "-",
    PROJECT: "E",
    SCRIPT_BREAKDOWN: "E",
    SCHEDULE: "E",
    LOCATIONS: "E",
    CREW: "E",
    CALL_SHEETS: "E",
    PO: "E",
    PRODUCTION_BUDGET: "E",
    DEPT_BUDGET: "-",
    PAYMENTS: "V",
    DEFERMENT: "S",
    RECONCILIATION: "-",
    TIMESHEETS: "V",
    AMORTIZATION: "V",
    MIS_CASHFLOW: "V",
    ANALYTICS: "V",
  },
  DEPARTMENT_HEAD: {
    VENDOR_MASTER: "V",
    VRF: "-",
    PROJECT: "V",
    SCRIPT_BREAKDOWN: "V",
    SCHEDULE: "V",
    LOCATIONS: "V",
    CREW: "V",
    CALL_SHEETS: "V",
    PO: "E",
    PRODUCTION_BUDGET: "-",
    DEPT_BUDGET: "E",
    PAYMENTS: "V",
    DEFERMENT: "S",
    RECONCILIATION: "-",
    TIMESHEETS: "V",
    AMORTIZATION: "-",
    MIS_CASHFLOW: "V",
    ANALYTICS: "V",
  },
  EMPLOYEE_CONTRACTOR: {
    VENDOR_MASTER: "-",
    VRF: "-",
    PROJECT: "-",
    SCRIPT_BREAKDOWN: "-",
    SCHEDULE: "-",
    LOCATIONS: "-",
    CREW: "-",
    CALL_SHEETS: "-",
    PO: "-",
    PRODUCTION_BUDGET: "-",
    DEPT_BUDGET: "-",
    PAYMENTS: "-",
    DEFERMENT: "-",
    RECONCILIATION: "-",
    TIMESHEETS: "S",
    AMORTIZATION: "-",
    MIS_CASHFLOW: "-",
    ANALYTICS: "-",
  },
  REPORTING_MANAGER: {
    VENDOR_MASTER: "-",
    VRF: "-",
    PROJECT: "-",
    SCRIPT_BREAKDOWN: "-",
    SCHEDULE: "-",
    LOCATIONS: "-",
    CREW: "-",
    CALL_SHEETS: "-",
    PO: "V",
    PRODUCTION_BUDGET: "-",
    DEPT_BUDGET: "V",
    PAYMENTS: "-",
    DEFERMENT: "-",
    RECONCILIATION: "-",
    TIMESHEETS: "A",
    AMORTIZATION: "-",
    MIS_CASHFLOW: "-",
    ANALYTICS: "-",
  },
  ADMIN_IT: {
    VENDOR_MASTER: "E",
    VRF: "V",
    PROJECT: "V",
    SCRIPT_BREAKDOWN: "V",
    SCHEDULE: "V",
    LOCATIONS: "V",
    CREW: "V",
    CALL_SHEETS: "V",
    PO: "V",
    PRODUCTION_BUDGET: "V",
    DEPT_BUDGET: "V",
    PAYMENTS: "V",
    DEFERMENT: "V",
    RECONCILIATION: "V",
    TIMESHEETS: "V",
    AMORTIZATION: "V",
    MIS_CASHFLOW: "V",
    ANALYTICS: "V",
  },
};

export function accessLevel(role: Role, module: ModuleKey): AccessLevel {
  return ACCESS_MATRIX[role][module];
}

export function canView(role: Role, module: ModuleKey): boolean {
  return accessLevel(role, module) !== "-";
}

export function canEdit(role: Role, module: ModuleKey): boolean {
  const level = accessLevel(role, module);
  return level === "E" || level === "A";
}

export function canApprove(role: Role, module: ModuleKey): boolean {
  return accessLevel(role, module) === "A";
}

export function canSubmitOwn(role: Role, module: ModuleKey): boolean {
  return accessLevel(role, module) === "S";
}

/** Bank details are masked by default per Sheet 6's "Permissioned by role" principle. */
export function canSeeUnmaskedBankDetails(role: Role): boolean {
  return canEdit(role, "VENDOR_MASTER");
}

export function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return "*".repeat(accountNo.length);
  return `${"*".repeat(accountNo.length - 4)}${accountNo.slice(-4)}`;
}
