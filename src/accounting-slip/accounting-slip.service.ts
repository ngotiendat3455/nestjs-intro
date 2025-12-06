import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingSlip } from '../entities';

interface UpsertAccountingSlipBody {
  // These follow the shape built by formatDataToSave on the frontend.
  orgId?: string;
  orgID?: string;
  companyCode?: string;
  slipType?: string;
  businessDay?: string;
  accountingDatetime?: string;
  customerBasicDataId?: string;
  customerBasicDataID?: string;
  accountingStaffID?: string;
  slipNumber?: string;
  // plus many detail/payment fields...
  [key: string]: any;
}

interface DailyStatisticQuery {
  companyCode?: string;
  businessDay?: string;
  orgID?: string;
  slipNumber?: string;
}

@Injectable()
export class AccountingSlipService {
  constructor(
    @InjectRepository(AccountingSlip)
    private readonly repo: Repository<AccountingSlip>,
  ) { }

  /**
   * Create new accounting slip.
   *
   * We persist the raw payload but also normalise a few header fields
   * for later querying (businessDay, slipType, companyCode, ...).
   */
  async create(payload: UpsertAccountingSlipBody) {
    const now = new Date();
    const businessDay = this.parseBusinessDay(payload.businessDay) ?? now;
    const slipType = payload.slipType || 'SAVED';
    const companyCode = payload.companyCode ?? null;

    const slipNumber = payload.slipNumber && payload.slipNumber.trim().length > 0
      ? payload.slipNumber.trim()
      : await this.generateSlipNumber(businessDay);

    const rec = this.repo.create({
      slipType,
      slipNumber,
      businessDay,
      accountingDatetime: payload.accountingDatetime
        ? new Date(payload.accountingDatetime)
        : now,
      companyCode,
      orgName: payload.orgName ?? null,
      customerName: payload.customerName ?? null,
      accountingStaffName: payload.accountingStaffName ?? null,
      includingTaxTotalAmount: Number(payload.includingTaxTotalAmount ?? 0),
      taxationTargetAmount: Number(payload.taxationTargetAmount ?? 0),
      exemptionTargetAmount: Number(payload.exemptionTargetAmount ?? 0),
      taxAmount: Number(payload.taxAmount ?? 0),
      paymentAmount: Number(payload.paymentAmount ?? 0),
      disbursementAmount: Number(payload.disbursementAmount ?? 0),
      payload,
    });

    const saved = await this.repo.save(rec);

    return {
      accountingSlipID: saved.accountingSlipID,
      slipNumber: saved.slipNumber,
    };
  }

  /**
   * Update existing slip.
   */
  async update(id: string, payload: UpsertAccountingSlipBody) {
    const rec = await this.findEntity(id);

    const businessDay = this.parseBusinessDay(payload.businessDay) ?? rec.businessDay;
    const slipType = payload.slipType || rec.slipType;
    const companyCode = payload.companyCode ?? rec.companyCode ?? null;

    rec.slipType = slipType;
    rec.businessDay = businessDay;
    rec.accountingDatetime = payload.accountingDatetime
      ? new Date(payload.accountingDatetime)
      : rec.accountingDatetime;
    rec.companyCode = companyCode;
    rec.orgName = payload.orgName ?? rec.orgName ?? null;
    rec.customerName = payload.customerName ?? rec.customerName ?? null;
    rec.accountingStaffName = payload.accountingStaffName ?? rec.accountingStaffName ?? null;
    rec.includingTaxTotalAmount = Number(payload.includingTaxTotalAmount ?? rec.includingTaxTotalAmount ?? 0);
    rec.taxationTargetAmount = Number(payload.taxationTargetAmount ?? rec.taxationTargetAmount ?? 0);
    rec.exemptionTargetAmount = Number(payload.exemptionTargetAmount ?? rec.exemptionTargetAmount ?? 0);
    rec.taxAmount = Number(payload.taxAmount ?? rec.taxAmount ?? 0);
    rec.paymentAmount = Number(payload.paymentAmount ?? rec.paymentAmount ?? 0);
    rec.disbursementAmount = Number(payload.disbursementAmount ?? rec.disbursementAmount ?? 0);
    rec.payload = payload;

    await this.repo.save(rec);

    return {
      accountingSlipID: rec.accountingSlipID,
      slipNumber: rec.slipNumber,
    };
  }

  async remove(id: string) {
    const rec = await this.findEntity(id);
    await this.repo.remove(rec);
    return { accountingSlipID: id };
  }

  async getDetail(id: string) {
    const rec = await this.findEntity(id);
    const { payload } = rec;

    const orgId = payload.orgId || payload.orgID || null;
    const customerBasicDataId = payload.customerBasicDataId || payload.customerBasicDataID || null;

    return {
      accountingSlipID: rec.accountingSlipID,
      slipNumber: rec.slipNumber,
      orgId,
      orgName: payload.orgName ?? null,
      companyCode: rec.companyCode ?? payload.companyCode ?? null,
      customerBasicDataId,
      customerName: payload.customerName ?? null,
      accountingStaffId: payload.accountingStaffID ?? null,
      accountingStaffName: payload.accountingStaffName ?? null,
      businessDay: this.formatDate(rec.businessDay),
      accountingDatetime: rec.accountingDatetime.toISOString(),
      note: payload.note ?? null,
      // Also expose the original payload so the FE can reuse it.
      ...payload,
    };
  }

  /**
   * Detail for printing – for now we simply reuse getDetail.
   */
  async getDetailForPrinting(id: string) {
    return this.getDetail(id);
  }

  /**
   * Daily slip statistic (header‑level summary).
   *
   * This approximates the legacy /v1/accountingSlips/dailySlipStatistic
   * response using the stored payload totals.
   */
  async dailySlipStatistic(query: DailyStatisticQuery) {
    const all = await this.repo.find();

    const filtered = all.filter((s) => {
      const payload = (s.payload ?? {}) as any;
      const businessDay = this.formatDate(s.businessDay);
      const orgId = payload.orgId || payload.orgID || null;
      const companyCode = s.companyCode ?? payload.companyCode ?? null;

      if (query.businessDay && businessDay !== query.businessDay) return false;
      if (query.orgID && orgId !== query.orgID) return false;
      if (query.companyCode && companyCode !== query.companyCode) return false;
      if (query.slipNumber && s.slipNumber !== query.slipNumber) return false;
      return true;
    });

    return filtered.map((s) => {
      const payload = (s.payload ?? {}) as any;

      const paymentRequests: any[] = payload.accountingPaymentRequests || [];

      return {
        slipType: payload.slipType || s.slipType,
        slipNumber: s.slipNumber,
        accountingSlipID: s.accountingSlipID,
        processingTime: s.accountingDatetime.toISOString(),
        salesAmount: Number(payload.includingTaxTotalAmount ?? 0),
        discountAmount: Number(payload.discountTotal ?? 0),
        depositAmount: Number(payload.paymentAmount ?? 0),
        withdrawalAmount: Number(payload.disbursementAmount ?? 0),
        ticketDigestion: Number(payload.ticketDigestion ?? 0) || null,
        totalContract: Number(payload.totalContract ?? 0) || null,
        totalSalonSales: Number(payload.totalSalonSales ?? 0) || null,
        totalStoreSales: Number(payload.totalStoreSales ?? 0) || null,
        totalAdministrativeFee: Number(payload.totalAdministrativeFee ?? 0) || 0,
        customer_basic_data_id: payload.customerBasicDataId || payload.customerBasicDataID || '',
        customerNumber: payload.customerNumber || '',
        customerName: payload.customerName || '',
        branchNumber: payload.branchNumber ?? null,
        accountingStaffId: payload.accountingStaffID || '',
        accountingStaffName: payload.accountingStaffName || '',
        accountingPayments: paymentRequests.map((p: any) => ({
          accountingSlipId: s.accountingSlipID,
          paymentId: p.paymentID || '',
          paymentName: p.paymentName || '',
          paymentAmount: Number(p.paymentAmount ?? 0),
        })),
      };
    });
  }

  /**
   * Daily detail statistic – simplified.
   *
   * We build a header record per slip and leave the detail breakdown
   * empty for now; frontend can still use the aggregated totals.
   */
  async dailyDetailStatistic(query: DailyStatisticQuery) {
    const all = await this.repo.find();

    const filtered = all.filter((s) => {
      const payload = (s.payload ?? {}) as any;
      const businessDay = this.formatDate(s.businessDay);
      const orgId = payload.orgId || payload.orgID || null;
      const companyCode = s.companyCode ?? payload.companyCode ?? null;

      if (query.businessDay && businessDay !== query.businessDay) return false;
      if (query.orgID && orgId !== query.orgID) return false;
      if (query.companyCode && companyCode !== query.companyCode) return false;
      if (query.slipNumber && s.slipNumber !== query.slipNumber) return false;
      return true;
    });

    return filtered.map((s) => {
      const payload = (s.payload ?? {}) as any;
      const paymentRequests: any[] = payload.accountingPaymentRequests || [];

      return {
        accountingSlipID: s.accountingSlipID,
        companyCode: s.companyCode ?? payload.companyCode ?? '',
        orgId: payload.orgId || payload.orgID || '',
        orgName: payload.orgName || '',
        accountingDatetime: s.accountingDatetime.toISOString(),
        businessDay: this.formatDate(s.businessDay),
        staffName: payload.accountingStaffName || '',
        slipType: payload.slipType || s.slipType,
        slipNumber: s.slipNumber,
        branchNumber: payload.branchNumber ?? null,
        customerBasicDataId: payload.customerBasicDataId || payload.customerBasicDataID || '',
        customerName: payload.customerName || '',
        customerNumber: payload.customerNumber || '',
        accountingStaffId: payload.accountingStaffID || '',
        accountingStaffName: payload.accountingStaffName || '',
        includingTaxTotalAmount: Number(payload.includingTaxTotalAmount ?? 0),
        taxationTargetAmount: Number(payload.taxationTargetAmount ?? 0),
        exemptionTargetAmount: Number(payload.exemptionTargetAmount ?? 0),
        taxAmount: Number(payload.taxAmount ?? 0),
        paymentAmount: Number(payload.paymentAmount ?? 0),
        disbursementAmount: Number(payload.disbursementAmount ?? 0),
        totalPoint: Number(payload.totalPoint ?? 0),
        pointExpirationDate: payload.pointExpirationDate || '',
        accountingSlipDetailStatisticDTOS: [],
        accountingPaymentResponses: paymentRequests.map((p: any) => ({
          accountingSlipId: s.accountingSlipID,
          paymentID: p.paymentID || '',
          companyCode: s.companyCode ?? payload.companyCode ?? '',
          paymentName: p.paymentName || '',
          processNumber: p.processNumber || '',
          accounting: Number(p.accounting ?? 0),
          creditID: p.creditID ?? null,
          creditName: p.creditName ?? null,
          frequency: p.frequency != null ? Number(p.frequency) : null,
          paymentAmount: Number(p.paymentAmount ?? 0),
        })),
        ticketDigestion: Number(payload.ticketDigestion ?? 0) || null,
      };
    });
  }

  /**
   * For now we don't implement complex RETURN logic.
   * This endpoint simply marks the slip as RETURN and merges payload.
   */
  async markReturn(id: string, payload: any) {
    const rec = await this.findEntity(id);
    rec.slipType = 'RETURN';
    rec.payload = {
      ...rec.payload,
      ...payload,
      slipType: 'RETURN',
    };
    await this.repo.save(rec);
    return {
      accountingSlipID: rec.accountingSlipID,
      slipType: rec.slipType,
      slipNumber: rec.slipNumber,
    };
  }

  private async findEntity(id: string) {
    const rec = await this.repo.findOne({ where: { accountingSlipID: id } });
    if (!rec) {
      throw new NotFoundException('AccountingSlip not found');
    }
    return rec;
  }

  private parseBusinessDay(v?: string) {
    if (!v) return null;
    // Accept both "YYYY-MM-DD" and ISO-like strings.
    const dateOnly = v.split('T')[0];
    if (!dateOnly) return null;
    return new Date(dateOnly);
  }

  private formatDate(v: string | Date) {
    const d = typeof v === 'string' ? new Date(v) : v;
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async generateSlipNumber(businessDay: Date | string) {
    const d = typeof businessDay === 'string' ? new Date(businessDay) : businessDay;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const prefix = `${y}${m}${day}`;

    // Simple, non‑perfect sequence generator: count existing slips for the day.
    const all = await this.repo.find();
    const countForDay = all.filter((s) => this.formatDate(s.businessDay) === this.formatDate(d)).length;
    const seq = `${countForDay + 1}`.padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}
