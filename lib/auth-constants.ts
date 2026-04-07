export const ACCESS_TOKEN_COOKIE = 'alwahaa-pools-access-token'
export const REFRESH_TOKEN_COOKIE = 'alwahaa-pools-refresh-token'

export const APP_ROLES = ['admin', 'manager', 'accountant', 'site_engineer', 'viewer'] as const

export type AppRole = (typeof APP_ROLES)[number]

export type AppPermissions = {
  canManageUsers: boolean
  canManageClients: boolean
  canManageVendors: boolean
  canCreateProjects: boolean
  canEditProjects: boolean
  canDeleteProjects: boolean
  canCreatePurchaseOrders: boolean
  canEditPurchaseOrders: boolean
  canDeletePurchaseOrders: boolean
  canManageExpenses: boolean
  canDeleteExpenses: boolean
  canCreateInvoices: boolean
  canEditInvoices: boolean
  canDeleteInvoices: boolean
  canManageReceipts: boolean
  canDeleteReceipts: boolean
  canManageVendorPayments: boolean
  canDeleteVendorPayments: boolean
  canViewReports: boolean
  canExportData: boolean
}

export function getRolePermissions(role: AppRole): AppPermissions {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageClients: true,
        canManageVendors: true,
        canCreateProjects: true,
        canEditProjects: true,
        canDeleteProjects: true,
        canCreatePurchaseOrders: true,
        canEditPurchaseOrders: true,
        canDeletePurchaseOrders: true,
        canManageExpenses: true,
        canDeleteExpenses: true,
        canCreateInvoices: true,
        canEditInvoices: true,
        canDeleteInvoices: true,
        canManageReceipts: true,
        canDeleteReceipts: true,
        canManageVendorPayments: true,
        canDeleteVendorPayments: true,
        canViewReports: true,
        canExportData: true,
      }
    case 'manager':
      return {
        canManageUsers: false,
        canManageClients: true,
        canManageVendors: true,
        canCreateProjects: true,
        canEditProjects: true,
        canDeleteProjects: false,
        canCreatePurchaseOrders: true,
        canEditPurchaseOrders: true,
        canDeletePurchaseOrders: true,
        canManageExpenses: true,
        canDeleteExpenses: true,
        canCreateInvoices: true,
        canEditInvoices: true,
        canDeleteInvoices: false,
        canManageReceipts: true,
        canDeleteReceipts: false,
        canManageVendorPayments: true,
        canDeleteVendorPayments: false,
        canViewReports: true,
        canExportData: true,
      }
    case 'accountant':
      return {
        canManageUsers: false,
        canManageClients: true,
        canManageVendors: true,
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canCreatePurchaseOrders: true,
        canEditPurchaseOrders: true,
        canDeletePurchaseOrders: false,
        canManageExpenses: true,
        canDeleteExpenses: false,
        canCreateInvoices: true,
        canEditInvoices: true,
        canDeleteInvoices: false,
        canManageReceipts: true,
        canDeleteReceipts: false,
        canManageVendorPayments: true,
        canDeleteVendorPayments: false,
        canViewReports: true,
        canExportData: true,
      }
    case 'site_engineer':
      return {
        canManageUsers: false,
        canManageClients: false,
        canManageVendors: false,
        canCreateProjects: false,
        canEditProjects: true, // Can update progress/status
        canDeleteProjects: false,
        canCreatePurchaseOrders: false,
        canEditPurchaseOrders: false,
        canDeletePurchaseOrders: false,
        canManageExpenses: true, // Can log site expenses
        canDeleteExpenses: false,
        canCreateInvoices: false,
        canEditInvoices: false,
        canDeleteInvoices: false,
        canManageReceipts: false,
        canDeleteReceipts: false,
        canManageVendorPayments: false,
        canDeleteVendorPayments: false,
        canViewReports: false,
        canExportData: false,
      }
    case 'viewer':
    default:
      return {
        canManageUsers: false,
        canManageClients: false,
        canManageVendors: false,
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canCreatePurchaseOrders: false,
        canEditPurchaseOrders: false,
        canDeletePurchaseOrders: false,
        canManageExpenses: false,
        canDeleteExpenses: false,
        canCreateInvoices: false,
        canEditInvoices: false,
        canDeleteInvoices: false,
        canManageReceipts: false,
        canDeleteReceipts: false,
        canManageVendorPayments: false,
        canDeleteVendorPayments: false,
        canViewReports: false,
        canExportData: false,
      }
  }
}

export function canEdit(role: AppRole): boolean {
  const permissions = getRolePermissions(role)
  return (
    permissions.canEditProjects ||
    permissions.canEditPurchaseOrders ||
    permissions.canManageExpenses ||
    permissions.canEditInvoices
  )
}
