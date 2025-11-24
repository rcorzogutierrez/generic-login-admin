// src/app/modules/projects/services/proposal-calculator.service.ts

import { Injectable } from '@angular/core';
import { Proposal, MaterialUsed } from '../models';

/**
 * Servicio para centralizar todos los cálculos financieros de proposals
 *
 * Este servicio asegura que todos los cálculos de impuestos, descuentos y totales
 * se realicen de manera consistente en toda la aplicación.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalCalculatorService {

  /**
   * Calcula el impuesto basado en subtotal y porcentaje
   *
   * @param subtotal - Subtotal sobre el cual calcular el impuesto
   * @param taxPercentage - Porcentaje de impuesto (0-100)
   * @returns Monto del impuesto
   */
  calculateTax(subtotal: number, taxPercentage: number): number {
    if (!taxPercentage || taxPercentage <= 0) {
      return 0;
    }
    return (subtotal * taxPercentage) / 100;
  }

  /**
   * Calcula el descuento basado en subtotal y porcentaje
   *
   * @param subtotal - Subtotal sobre el cual calcular el descuento
   * @param discountPercentage - Porcentaje de descuento (0-100)
   * @returns Monto del descuento
   */
  calculateDiscount(subtotal: number, discountPercentage: number): number {
    if (!discountPercentage || discountPercentage <= 0) {
      return 0;
    }
    return (subtotal * discountPercentage) / 100;
  }

  /**
   * Calcula el total final aplicando impuestos y descuentos
   *
   * @param subtotal - Subtotal base
   * @param tax - Monto de impuesto
   * @param discount - Monto de descuento
   * @returns Total final
   */
  calculateTotal(subtotal: number, tax: number, discount: number): number {
    return subtotal + tax - discount;
  }

  /**
   * Calcula el total de materiales usados
   *
   * @param materials - Array de materiales con amount y price
   * @returns Total de materiales
   */
  calculateMaterialsTotal(materials?: MaterialUsed[]): number {
    if (!materials || materials.length === 0) {
      return 0;
    }

    return materials.reduce((total, material) => {
      return total + (material.amount * material.price);
    }, 0);
  }

  /**
   * Calcula el subtotal combinado (trabajo + materiales)
   *
   * @param workSubtotal - Subtotal del trabajo
   * @param materials - Array de materiales
   * @returns Subtotal combinado
   */
  calculateCombinedSubtotal(workSubtotal: number, materials?: MaterialUsed[]): number {
    const materialsTotal = this.calculateMaterialsTotal(materials);
    return workSubtotal + materialsTotal;
  }

  /**
   * Calcula el impuesto para un proposal (con o sin materiales)
   * Si hay materiales, recalcula sobre el subtotal combinado
   *
   * @param proposal - El proposal con todos sus datos
   * @returns Monto del impuesto
   */
  calculateProposalTax(proposal: Partial<Proposal>): number {
    const hasMaterials = proposal.materialsUsed && proposal.materialsUsed.length > 0;

    if (!hasMaterials) {
      // Sin materiales: usar el impuesto original
      return proposal.tax || 0;
    }

    // Con materiales: recalcular sobre el subtotal combinado
    const combinedSubtotal = this.calculateCombinedSubtotal(
      proposal.subtotal || 0,
      proposal.materialsUsed
    );
    return this.calculateTax(combinedSubtotal, proposal.taxPercentage || 0);
  }

  /**
   * Calcula el descuento para un proposal (con o sin materiales)
   * Si hay materiales, recalcula sobre el subtotal combinado
   *
   * @param proposal - El proposal con todos sus datos
   * @returns Monto del descuento
   */
  calculateProposalDiscount(proposal: Partial<Proposal>): number {
    const hasMaterials = proposal.materialsUsed && proposal.materialsUsed.length > 0;

    if (!hasMaterials) {
      // Sin materiales: usar el descuento original
      return proposal.discount || 0;
    }

    // Con materiales: recalcular sobre el subtotal combinado
    const combinedSubtotal = this.calculateCombinedSubtotal(
      proposal.subtotal || 0,
      proposal.materialsUsed
    );
    return this.calculateDiscount(combinedSubtotal, proposal.discountPercentage || 0);
  }

  /**
   * Calcula el gran total de un proposal (con o sin materiales)
   *
   * @param proposal - El proposal con todos sus datos
   * @returns Gran total
   */
  calculateProposalGrandTotal(proposal: Partial<Proposal>): number {
    const hasMaterials = proposal.materialsUsed && proposal.materialsUsed.length > 0;

    if (!hasMaterials) {
      // Sin materiales: usar el total original
      return proposal.total || 0;
    }

    // Con materiales: calcular el gran total con impuestos y descuentos recalculados
    const combinedSubtotal = this.calculateCombinedSubtotal(
      proposal.subtotal || 0,
      proposal.materialsUsed
    );
    const tax = this.calculateProposalTax(proposal);
    const discount = this.calculateProposalDiscount(proposal);

    return this.calculateTotal(combinedSubtotal, tax, discount);
  }

  /**
   * Calcula todos los totales de un proposal en un solo objeto
   * Útil para obtener todos los cálculos de una vez
   *
   * @param proposal - El proposal con todos sus datos
   * @returns Objeto con todos los totales calculados
   */
  calculateAllTotals(proposal: Partial<Proposal>) {
    const hasMaterials = proposal.materialsUsed && proposal.materialsUsed.length > 0;
    const materialsTotal = this.calculateMaterialsTotal(proposal.materialsUsed);
    const combinedSubtotal = this.calculateCombinedSubtotal(
      proposal.subtotal || 0,
      proposal.materialsUsed
    );

    return {
      workSubtotal: proposal.subtotal || 0,
      materialsTotal,
      combinedSubtotal,
      tax: this.calculateProposalTax(proposal),
      discount: this.calculateProposalDiscount(proposal),
      total: hasMaterials
        ? this.calculateProposalGrandTotal(proposal)
        : proposal.total || 0,
      hasMaterials
    };
  }
}
