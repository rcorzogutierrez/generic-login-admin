import { Timestamp } from 'firebase/firestore';

// ============================================
// PAYMENT METHODS
// ============================================
export type PaymentMethod = 'check' | 'transfer' | 'cash';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  check: 'Cheque',
  transfer: 'Transferencia',
  cash: 'Efectivo'
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  check: 'money',
  transfer: 'account_balance',
  cash: 'payments'
};

// ============================================
// COBRO (Collection from Client)
// ============================================
export interface Cobro {
  id: string;

  // System fields
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
  isActive: boolean;

  // Transaction details
  transactionDate: Timestamp;        // Fecha del cheque/transferencia
  amount: number;                    // Monto
  paymentMethod: PaymentMethod;      // Tipo de pago

  // Client reference (who paid)
  clientId: string;                  // ID del cliente
  clientName: string;                // Nombre denormalizado

  // Project/Invoice reference
  proposalId: string;                // Proyecto facturado relacionado
  proposalNumber: string;            // Número de propuesta/factura denormalizado

  // Check-specific fields
  checkNumber?: string;              // Número de cheque (si aplica)
  bankName?: string;                 // Banco emisor
  checkImageUrl?: string;            // URL de imagen del cheque

  // Transfer-specific fields
  referenceNumber?: string;          // Número de referencia (transferencia)

  // Additional
  notes?: string;
}

export type CreateCobroData = Omit<Cobro, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isActive'>;
export type UpdateCobroData = Partial<CreateCobroData>;

// ============================================
// PAGO (Payment to Worker)
// ============================================
export interface Pago {
  id: string;

  // System fields
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
  isActive: boolean;

  // Transaction details
  transactionDate: Timestamp;        // Fecha del cheque/transferencia
  amount: number;                    // Monto
  paymentMethod: PaymentMethod;      // Tipo de pago

  // Worker reference (who receives payment)
  workerId: string;                  // ID del trabajador
  workerName: string;                // Nombre denormalizado

  // Project references (one or more projects)
  proposalIds: string[];             // Proyectos relacionados
  proposalNumbers: string[];         // Números denormalizados

  // Check-specific fields
  checkNumber?: string;              // Número de cheque (si aplica)
  bankName?: string;                 // Banco emisor
  checkImageUrl?: string;            // URL de imagen del cheque

  // Transfer-specific fields
  referenceNumber?: string;          // Número de referencia (transferencia)

  // Additional
  notes?: string;
}

export type CreatePagoData = Omit<Pago, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isActive'>;
export type UpdatePagoData = Partial<CreatePagoData>;

// ============================================
// STATISTICS
// ============================================
export interface TreasuryStats {
  totalCobros: number;
  totalPagos: number;
  sumaCobros: number;
  sumaPagos: number;
  balance: number;
  cobrosEsteMes: number;
  pagosEsteMes: number;
}

// ============================================
// FILTERS
// ============================================
export interface CobroFilters {
  clientId?: string;
  proposalId?: string;
  paymentMethod?: PaymentMethod;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}

export interface PagoFilters {
  workerId?: string;
  proposalId?: string;
  paymentMethod?: PaymentMethod;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}
