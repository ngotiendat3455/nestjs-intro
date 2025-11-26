import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomerListDisplaySetting, CustomerNumberFormatSetting, CustomerSerialCounter, DateOptions, FiscalYearOptions, FormatPart, LiteralOptions, NumberFormatScope, NumberFormatTarget, PartType, ResetPolicy, SerialOptions } from '../entities/customer-number-format.entity';
import { Org } from '../entities';

@Injectable()
export class CustomerNumberFormatService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CustomerNumberFormatSetting)
    private readonly fmtRepo: Repository<CustomerNumberFormatSetting>,
    @InjectRepository(CustomerSerialCounter)
    private readonly counterRepo: Repository<CustomerSerialCounter>,
    @InjectRepository(CustomerListDisplaySetting)
    private readonly displayRepo: Repository<CustomerListDisplaySetting>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) {}

  // Settings CRUD
  async getEffective(target: NumberFormatTarget, orgId?: string) {
    if (!target || (target !== 'CUSTOMER_NO' && target !== 'MANAGEMENT_NO')) throw new BadRequestException('invalid target');
    const byOrg = orgId
      ? await this.fmtRepo.findOne({ where: { target, scope: 'ORG', org: { id: orgId } as any } })
      : null;
    if (byOrg) return byOrg;
    const global = await this.fmtRepo.findOne({ where: { target, scope: 'GLOBAL' } });
    if (!global) throw new NotFoundException('format not found');
    return global;
  }

  async createSetting(body: any) {
    const target = this.reqTarget(body.target);
    const scope = this.reqScope(body.scope);
    const orgId = scope === 'ORG' ? this.reqString(body.orgId, 'orgId') : null;
    const enabled = body.enabled === false ? false : true;
    const parts = this.reqParts(body.parts);
    const joiner = body.joiner ? this.reqHalfwidth(body.joiner, 'joiner') : null;
    const fiscalYearStartMonth = body.fiscalYearStartMonth ? this.reqMonth(body.fiscalYearStartMonth) : 4;
    const description = body.description ?? null;

    const exists = await this.fmtRepo.findOne({ where: { target, scope, org: orgId ? ({ id: orgId } as any) : null } });
    if (exists) throw new ConflictException('setting already exists for scope/target');

    const entity = this.fmtRepo.create({
      target,
      scope,
      org: orgId ? ({ id: orgId } as any) : null,
      enabled,
      parts,
      joiner,
      fiscalYearStartMonth,
      description,
    });
    return await this.fmtRepo.save(entity);
  }

  async updateSetting(id: string, body: any) {
    const e = await this.fmtRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('setting not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== e.version) throw new ConflictException('Version mismatch');

    if (body.enabled !== undefined) e.enabled = Boolean(body.enabled);
    if (body.parts !== undefined) e.parts = this.reqParts(body.parts);
    if (body.joiner !== undefined) e.joiner = body.joiner ? this.reqHalfwidth(body.joiner, 'joiner') : null;
    if (body.fiscalYearStartMonth !== undefined) e.fiscalYearStartMonth = this.reqMonth(body.fiscalYearStartMonth);
    if (body.description !== undefined) e.description = body.description ?? null;
    return await this.fmtRepo.save(e);
  }

  // Preview and Generate
  async preview(body: any) {
    const date = body.sample?.date ? this.reqDate(body.sample.date, 'sample.date') : this.todayYMD();
    const orgId: string | undefined = body.sample?.orgId ?? undefined;
    const cfg: CustomerNumberFormatSetting = body.id
      ? await (async () => {
          const found = await this.fmtRepo.findOne({ where: { id: String(body.id) } });
          if (!found) throw new NotFoundException('setting not found');
          return found;
        })()
      : await (async () => this.fmtRepo.create(this.parseSettingShape(body.config)))();
    const value = await this.buildValue(cfg, date, orgId, /*serial*/ undefined);
    const parts = await this.expandParts(cfg, date, orgId);
    return { sample: value, parts };
  }

  async generate(body: any) {
    const target = this.reqTarget(body.target);
    const date = body.date ? this.reqDate(body.date, 'date') : this.todayYMD();
    const orgId: string | undefined = body.orgId ?? undefined;
    const cfg = await this.getEffective(target, orgId);
    if (!cfg.enabled) throw new BadRequestException('format disabled');
    return await this.generateWithCounter(cfg, date, orgId);
  }

  private async generateWithCounter(cfg: CustomerNumberFormatSetting, date: string, orgId?: string) {
    return await this.dataSource.transaction('READ COMMITTED', async (manager) => {
      // Determine serial contexts with options
      const serialCtxs = this.computeSerialContextsWithOptions(cfg, date, orgId);
      const serialMap: Record<string, number> = {};
      for (const ctx of serialCtxs) {
        const repo = manager.getRepository(CustomerSerialCounter);
        let counter = await repo
          .createQueryBuilder('c')
          .setLock('pessimistic_write')
          .where('c.formatSettingId = :fid AND c.contextKey = :ck', { fid: cfg.id, ck: ctx.key })
          .getOne();
        if (!counter) {
          // try insert; handle race by catching unique violation
          try {
            counter = repo.create({ formatSetting: { id: cfg.id } as any, contextKey: ctx.key, currentValue: ctx.startFrom || 0 });
            await repo.save(counter);
          } catch (e: any) {
            // unique -> reselect with lock
            counter = await repo
              .createQueryBuilder('c')
              .setLock('pessimistic_write')
              .where('c.formatSettingId = :fid AND c.contextKey = :ck', { fid: cfg.id, ck: ctx.key })
              .getOne();
            if (!counter) throw e;
          }
        }
        const current = counter.currentValue ?? 0;
        const nextVal = (Number.isFinite(current) ? current : 0) + (ctx.step || 1);
        counter.currentValue = nextVal;
        await repo.save(counter);
        serialMap[ctx.key] = nextVal;
      }
      const value = await this.buildValue(cfg, date, orgId, serialMap);
      return { value };
    });
  }

  // Display settings
  async getListDisplay(orgId?: string) {
    const byOrg = orgId
      ? await this.displayRepo.findOne({ where: { scope: 'ORG', org: { id: orgId } as any } })
      : null;
    if (byOrg) return byOrg;
    const global = await this.displayRepo.findOne({ where: { scope: 'GLOBAL' } });
    if (global) return global;
    // default
    return this.displayRepo.create({ scope: 'GLOBAL', showCustomerNo: true, showManagementNo: false });
  }

  async upsertListDisplay(body: any) {
    const scope = this.reqScope(body.scope);
    const orgId = scope === 'ORG' ? this.reqString(body.orgId, 'orgId') : null;
    const showCustomerNo = body.showCustomerNo !== false;
    const showManagementNo = Boolean(body.showManagementNo);
    let e = await this.displayRepo.findOne({ where: { scope, org: orgId ? ({ id: orgId } as any) : null } });
    if (!e) {
      e = this.displayRepo.create({ scope, org: orgId ? ({ id: orgId } as any) : null, showCustomerNo, showManagementNo });
    } else {
      const ifMatchVersion: number | undefined = body.ifMatchVersion;
      if (typeof ifMatchVersion === 'number' && ifMatchVersion !== e.version) throw new ConflictException('Version mismatch');
      e.showCustomerNo = showCustomerNo;
      e.showManagementNo = showManagementNo;
    }
    return await this.displayRepo.save(e);
  }

  // Build helpers
  private async buildValue(
    cfg: CustomerNumberFormatSetting,
    date: string,
    orgId?: string,
    serialValues?: Record<string, number>,
  ): Promise<string> {
    const parts = await this.expandParts(cfg, date, orgId, serialValues);
    const joiner = cfg.joiner ?? '';
    return parts.map((p) => p.value).filter((v) => v !== '').join(joiner);
  }

  private async expandParts(
    cfg: CustomerNumberFormatSetting,
    date: string,
    orgId?: string,
    serialValues?: Record<string, number>,
  ): Promise<{ type: PartType; value: string }[]> {
    const out: { type: PartType; value: string }[] = [];
    for (const p of cfg.parts || []) {
      switch (p.type) {
        case 'LITERAL': {
          const v = String((p.options as LiteralOptions)?.value ?? '');
          if (v && !this.isHalfwidth(v)) throw new BadRequestException('LITERAL must be halfwidth');
          out.push({ type: 'LITERAL', value: v });
          break;
        }
        case 'ORG_CODE': {
          if (!orgId) throw new BadRequestException('orgId required for ORG_CODE');
          const org = await this.orgRepo.findOne({ where: { id: orgId } });
          if (!org) throw new BadRequestException('orgId invalid for ORG_CODE');
          out.push({ type: 'ORG_CODE', value: String(org.orgCode || '').trim() });
          break;
        }
        case 'DATE': {
          const fmt = (p.options as DateOptions)?.format || 'YYYYMMDD';
          out.push({ type: 'DATE', value: this.formatDate(date, fmt) });
          break;
        }
        case 'FISCAL_YEAR': {
          const opt = (p.options as FiscalYearOptions) || { style: 'YYYY', startMonth: cfg.fiscalYearStartMonth };
          const fy = this.fiscalYearOf(date, opt.startMonth || cfg.fiscalYearStartMonth);
          const v = opt.style === 'YY' ? String(fy % 100).padStart(2, '0') : String(fy);
          out.push({ type: 'FISCAL_YEAR', value: v });
          break;
        }
        case 'SERIAL': {
          const opt = (p.options as SerialOptions) || ({} as SerialOptions);
          const ctx = this.serialContextKey(cfg, opt, date, orgId);
          const step = opt.step && opt.step > 0 ? opt.step : 1;
          const startFrom = Number.isFinite(opt.startFrom as any) ? Number(opt.startFrom) : 0;
          const valNum = serialValues?.[ctx] ?? startFrom + step; // preview fallback: first next value
          const digits = Math.min(Math.max(opt.digits || 4, 1), 12);
          out.push({ type: 'SERIAL', value: String(valNum).padStart(digits, '0') });
          break;
        }
        default:
          out.push({ type: p.type as PartType, value: '' });
      }
    }
    return out;
  }

  private computeSerialContextsWithOptions(cfg: CustomerNumberFormatSetting, date: string, orgId?: string): { key: string; step: number; startFrom: number }[] {
    const items: { key: string; step: number; startFrom: number }[] = [];
    for (const p of cfg.parts || []) {
      if (p.type !== 'SERIAL') continue;
      const opt = (p.options as SerialOptions) || ({} as SerialOptions);
      const key = this.serialContextKey(cfg, opt, date, orgId);
      const step = opt.step && opt.step > 0 ? opt.step : 1;
      const startFrom = Number.isFinite(opt.startFrom as any) ? Number(opt.startFrom) : 0;
      if (!items.find((x) => x.key === key)) items.push({ key, step, startFrom });
    }
    return items;
  }

  private serialContextKey(cfg: CustomerNumberFormatSetting, opt: SerialOptions, date: string, orgId?: string) {
    const reset = opt.resetPolicy || 'NEVER';
    const scope = opt.scope || 'GLOBAL';
    const base: string[] = [];
    base.push(`target=${cfg.target}`);
    if (scope === 'ORG') base.push(`org=${orgId || 'none'}`);
    switch (reset) {
      case 'DAILY':
        base.push(`date=${this.formatDate(date, 'YYYYMMDD')}`);
        break;
      case 'MONTHLY':
        base.push(`month=${this.formatDate(date, 'YYYY-MM')}`);
        break;
      case 'YEARLY':
        base.push(`year=${date.slice(0, 4)}`);
        break;
      case 'FISCAL_YEARLY': {
        const fy = this.fiscalYearOf(date, cfg.fiscalYearStartMonth || 4);
        base.push(`fy=${fy}`);
        if (scope === 'ORG' && orgId) base.push(`org=${orgId}`);
        break;
      }
      case 'NEVER':
      default:
        base.push('global');
    }
    return base.join('&');
  }

  // Validation helpers
  private reqTarget(v: any): NumberFormatTarget {
    if (v === 'CUSTOMER_NO' || v === 'MANAGEMENT_NO') return v;
    throw new BadRequestException('target must be CUSTOMER_NO|MANAGEMENT_NO');
  }
  private reqScope(v: any): NumberFormatScope {
    if (v === 'GLOBAL' || v === 'ORG') return v;
    throw new BadRequestException('scope must be GLOBAL|ORG');
  }
  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }
  private reqDate(v: any, field: string) {
    if (typeof v !== 'string') throw new BadRequestException(`field ${field} must be date string`);
    const s = v.includes('/') ? v.replace(/\//g, '-') : v;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    return s;
  }
  private reqMonth(v: any) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 12) throw new BadRequestException('fiscalYearStartMonth must be 1..12');
    return n;
  }
  private isHalfwidth(s: string) {
    return /^[\x20-\x7E]*$/.test(s);
  }
  private reqHalfwidth(v: any, field: string) {
    if (typeof v !== 'string') throw new BadRequestException(`${field} must be string`);
    const s = v.trim();
    if (!this.isHalfwidth(s)) throw new BadRequestException(`${field} must be halfwidth ASCII`);
    return s;
  }
  private parseSettingShape(raw: any): Partial<CustomerNumberFormatSetting> {
    if (!raw) throw new BadRequestException('config is required');
    const target = this.reqTarget(raw.target);
    const scope = this.reqScope(raw.scope);
    const orgId = scope === 'ORG' ? this.reqString(raw.orgId, 'orgId') : null;
    const enabled = raw.enabled === false ? false : true;
    const parts = this.reqParts(raw.parts);
    const joiner = raw.joiner ? this.reqHalfwidth(raw.joiner, 'joiner') : null;
    const fiscalYearStartMonth = raw.fiscalYearStartMonth ? this.reqMonth(raw.fiscalYearStartMonth) : 4;
    return {
      target,
      scope,
      org: orgId ? ({ id: orgId } as any) : null,
      enabled,
      parts,
      joiner,
      fiscalYearStartMonth,
      description: raw.description ?? null,
    } as Partial<CustomerNumberFormatSetting>;
  }
  private reqParts(v: any): FormatPart[] {
    if (!Array.isArray(v) || v.length === 0) throw new BadRequestException('parts must be non-empty array');
    const out: FormatPart[] = [];
    for (const p of v) {
      if (!p || typeof p !== 'object') throw new BadRequestException('invalid part');
      const t = String(p.type || '').toUpperCase();
      if (!['SERIAL', 'DATE', 'FISCAL_YEAR', 'ORG_CODE', 'LITERAL'].includes(t)) throw new BadRequestException(`unsupported part type ${p.type}`);
      if (t === 'LITERAL') {
        const s = this.reqHalfwidth((p.options?.value ?? '') as any, 'LITERAL.value');
        out.push({ type: 'LITERAL', options: { value: s } as LiteralOptions });
      } else if (t === 'DATE') {
        const fmt = (p.options?.format as any) || 'YYYYMMDD';
        if (!['YYYYMMDD', 'YYMMDD', 'YYYY-MM', 'YYYY-MM-DD'].includes(fmt)) throw new BadRequestException('invalid DATE.format');
        out.push({ type: 'DATE', options: { format: fmt } as DateOptions });
      } else if (t === 'FISCAL_YEAR') {
        const style = (p.options?.style as any) || 'YYYY';
        if (!['YYYY', 'YY'].includes(style)) throw new BadRequestException('invalid FISCAL_YEAR.style');
        const startMonth = p.options?.startMonth ? this.reqMonth(p.options.startMonth) : 4;
        out.push({ type: 'FISCAL_YEAR', options: { style, startMonth } as FiscalYearOptions });
      } else if (t === 'ORG_CODE') {
        out.push({ type: 'ORG_CODE', options: {} });
      } else if (t === 'SERIAL') {
        const digits = p.options?.digits ? Number(p.options.digits) : 4;
        if (!Number.isFinite(digits) || digits < 1 || digits > 12) throw new BadRequestException('SERIAL.digits must be 1..12');
        const resetPolicy = (p.options?.resetPolicy as ResetPolicy) || 'NEVER';
        if (!['NEVER', 'DAILY', 'MONTHLY', 'YEARLY', 'FISCAL_YEARLY'].includes(resetPolicy)) throw new BadRequestException('invalid SERIAL.resetPolicy');
        const scope = (p.options?.scope as any) || 'GLOBAL';
        if (!['GLOBAL', 'ORG', 'FISCAL_YEAR'].includes(scope)) throw new BadRequestException('invalid SERIAL.scope');
        const startFrom = p.options?.startFrom != null ? Number(p.options.startFrom) : 0;
        const step = p.options?.step != null ? Number(p.options.step) : 1;
        if (!Number.isFinite(startFrom) || startFrom < 0) throw new BadRequestException('SERIAL.startFrom must be >= 0');
        if (!Number.isFinite(step) || step <= 0) throw new BadRequestException('SERIAL.step must be > 0');
        out.push({ type: 'SERIAL', options: { digits, resetPolicy, scope, startFrom, step } as SerialOptions });
      }
    }
    return out;
  }

  // Date helpers
  private todayYMD(): string {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  private formatDate(ymd: string, fmt: string) {
    const y = ymd.slice(0, 4);
    const m = ymd.slice(5, 7);
    const d = ymd.slice(8, 10);
    switch (fmt) {
      case 'YYYYMMDD':
        return `${y}${m}${d}`;
      case 'YYMMDD':
        return `${y.slice(2)}${m}${d}`;
      case 'YYYY-MM':
        return `${y}-${m}`;
      case 'YYYY-MM-DD':
      default:
        return `${y}-${m}-${d}`;
    }
  }
  private fiscalYearOf(ymd: string, startMonth: number) {
    const y = Number(ymd.slice(0, 4));
    const m = Number(ymd.slice(5, 7));
    if (m >= startMonth) return y + 0;
    return y - 1;
  }
}
