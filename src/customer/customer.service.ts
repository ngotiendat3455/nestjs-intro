import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Customer,
  CustomerAddress,
  CustomerContact,
  CustomerContract,
  CustomerReverberation,
  CustomerStatusEnum,
  ContractCourse,
} from '../entities';
import { AddressTypeEnum } from '../entities/customer-address.entity';
import { ContractStatusEnum } from '../entities/customer-contract.entity';
import { CustomerNumberFormatService } from '../customer-number-format/customer-number-format.service';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type AddressType = 'BILLING' | 'SHIPPING' | 'OFFICE';
export type ContractStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CustomerStatus;
  industry?: string;
  tags?: string; // CSV
  contractActiveAt?: string; // YYYY-MM-DD
  sortBy?: 'customerCode' | 'customerName' | 'updatedAt' | 'contractStartDate';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerContact)
    private readonly contactRepo: Repository<CustomerContact>,
    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
    @InjectRepository(CustomerContract)
    private readonly contractRepo: Repository<CustomerContract>,
    @InjectRepository(CustomerReverberation)
    private readonly reverberationRepo: Repository<CustomerReverberation>,
    @InjectRepository(ContractCourse)
    private readonly contractCourseRepo: Repository<ContractCourse>,
    private readonly numberFmt: CustomerNumberFormatService,
  ) {}

  // Customers
  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    const qb = this.customerRepo.createQueryBuilder('c');
    if (query.search) {
      qb.andWhere(
        "(c.customerCode ILIKE :s OR c.customerName ILIKE :s OR COALESCE(c.email,'') ILIKE :s OR COALESCE(c.phone,'') ILIKE :s)",
        { s: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.industry) qb.andWhere('c.industry = :industry', { industry: query.industry });
    if (query.tags) {
      // require that all tags exist in tags array
      const tags = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        qb.andWhere("c.tags @> :tags::jsonb", { tags: JSON.stringify(tags) });
      }
    }
    if (query.contractActiveAt) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM customer_contracts ct WHERE ct."customerId" = c.id AND ct."startDate" <= :d AND (:d < ct."endDate" OR ct."endDate" IS NULL))`,
        { d: query.contractActiveAt },
      );
    }
    const sortMap: Record<string, string> = {
      customerCode: 'c.customerCode',
      customerName: 'c.customerName',
      updatedAt: 'c.updatedAt',
      contractStartDate: 'c.updatedAt',
    };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 'c.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async getOne(id: string) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    const [contacts, addresses, contracts] = await Promise.all([
      this.contactRepo.find({ where: { customer: { id } as any } }),
      this.addressRepo.find({ where: { customer: { id } as any } }),
      this.contractRepo.find({ where: { customer: { id } as any }, relations: ['contractCourse'] }),
    ]);
    const contractDtos = contracts.map((ct) => this.toContractDto(ct));
    return { ...c, contacts, addresses, contracts: contractDtos } as any;
  }

  async add(body: any) {
    // Generate customerCode if not provided
    let customerCode: string;
    if (typeof body.customerCode === 'string' && body.customerCode.trim()) {
      customerCode = body.customerCode.trim();
    } else {
      const orgId = body.orgId ?? undefined;
      let attempts = 0;
      while (true) {
        attempts += 1;
        const gen = await this.numberFmt.generate({ target: 'CUSTOMER_NO', orgId });
        customerCode = gen.value;
        const exists = await this.customerRepo.findOne({ where: { customerCode } });
        if (!exists) break;
        if (attempts >= 3) throw new ConflictException('Unable to allocate unique customerCode');
      }
    }
    const customerName = this.reqString(body.customerName, 'customerName');
    const status: CustomerStatusEnum = body.status === 'INACTIVE' ? CustomerStatusEnum.INACTIVE : CustomerStatusEnum.ACTIVE;

    const dup = await this.customerRepo.findOne({ where: { customerCode } });
    if (dup) throw new ConflictException('customerCode already exists');

    const entity = this.customerRepo.create({
      customerCode,
      customerName,
      status,
      industry: body.industry ?? null,
      taxCode: body.taxCode ?? null,
      website: body.website ?? null,
      email: body.email ? this.optEmail(body.email) : null,
      phone: body.phone ? this.optPhone(body.phone) : null,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : null,
      note: body.note ?? null,
      paymentTermDays: this.optNumber(body.paymentTermDays),
      creditLimit: body.creditLimit != null ? String(this.optNumber(body.creditLimit)) : null,
      defaultBillingAddressId: null,
      defaultShippingAddressId: null,
    });
    return await this.customerRepo.save(entity);
  }

  async edit(id: string, body: any) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== c.version) throw new ConflictException('Version mismatch');

    if (typeof body.customerName === 'string' && body.customerName.trim().length > 0) c.customerName = body.customerName.trim();
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') (c as any).status = body.status;
    if (body.industry !== undefined) c.industry = body.industry ?? null;
    if (body.taxCode !== undefined) c.taxCode = body.taxCode ?? null;
    if (body.website !== undefined) c.website = body.website ?? null;
    if (body.email !== undefined) c.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) c.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.tags !== undefined) c.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    if (body.note !== undefined) c.note = body.note ?? null;
    if (body.paymentTermDays !== undefined) c.paymentTermDays = this.optNumber(body.paymentTermDays);
    if (body.creditLimit !== undefined) c.creditLimit = body.creditLimit != null ? String(this.optNumber(body.creditLimit)) : null;

    return await this.customerRepo.save(c);
  }

  // Contacts
  async listContacts(customerId: string) {
    await this.ensureCustomer(customerId);
    return this.contactRepo.find({ where: { customer: { id: customerId } as any } });
  }

  async addContact(customerId: string, body: any) {
    await this.ensureCustomer(customerId);
    const name = this.reqString(body.name, 'name');
    const email = body.email ? this.optEmail(body.email) : null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const isPrimary = Boolean(body.isPrimary);
    if (isPrimary) await this.demoteOtherPrimaryContact(customerId);
    const contact = this.contactRepo.create({
      customer: { id: customerId } as any,
      name,
      email,
      phone,
      position: body.position ?? null,
      department: body.department ?? null,
      isPrimary,
    });
    return await this.contactRepo.save(contact);
  }

  async editContact(customerId: string, contactId: string, body: any) {
    await this.ensureCustomer(customerId);
    const c = await this.contactRepo.findOne({ where: { contactId, customer: { id: customerId } as any } });
    if (!c) throw new NotFoundException('Contact not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== c.version) throw new ConflictException('Version mismatch');

    if (typeof body.name === 'string' && body.name.trim().length > 0) c.name = body.name.trim();
    if (body.email !== undefined) c.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) c.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.position !== undefined) c.position = body.position ?? null;
    if (body.department !== undefined) c.department = body.department ?? null;
    if (body.isPrimary !== undefined) {
      const setPrimary = Boolean(body.isPrimary);
      if (setPrimary) await this.demoteOtherPrimaryContact(customerId, contactId);
      c.isPrimary = setPrimary;
    }
    return await this.contactRepo.save(c);
  }

  // Addresses
  async listAddresses(customerId: string) {
    await this.ensureCustomer(customerId);
    return this.addressRepo.find({ where: { customer: { id: customerId } as any } });
  }

  async addAddress(customerId: string, body: any) {
    await this.ensureCustomer(customerId);
    const type = this.reqAddressType(body.type);
    const isDefault = Boolean(body.isDefault);
    if (isDefault) await this.clearDefaultAddress(customerId, type);
    const addr = this.addressRepo.create({
      customer: { id: customerId } as any,
      type: type as any,
      postalCode: body.postalCode ?? null,
      prefecture: body.prefecture ?? null,
      city: body.city ?? null,
      street: body.street ?? null,
      building: body.building ?? null,
      country: body.country ?? null,
      isDefault,
    });
    const saved = await this.addressRepo.save(addr);
    await this.updateCustomerDefaultIds(customerId);
    return saved;
  }

  async editAddress(customerId: string, addressId: string, body: any) {
    await this.ensureCustomer(customerId);
    const a = await this.addressRepo.findOne({ where: { addressId, customer: { id: customerId } as any } });
    if (!a) throw new NotFoundException('Address not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== a.version) throw new ConflictException('Version mismatch');

    if (body.type !== undefined) (a as any).type = this.reqAddressType(body.type) as any;
    if (body.postalCode !== undefined) a.postalCode = body.postalCode ?? null;
    if (body.prefecture !== undefined) a.prefecture = body.prefecture ?? null;
    if (body.city !== undefined) a.city = body.city ?? null;
    if (body.street !== undefined) a.street = body.street ?? null;
    if (body.building !== undefined) a.building = body.building ?? null;
    if (body.country !== undefined) a.country = body.country ?? null;
    if (body.isDefault !== undefined) {
      const setDefault = Boolean(body.isDefault);
      if (setDefault) await this.clearDefaultAddress(customerId, a.type as any, addressId);
      a.isDefault = setDefault;
    }
    const saved = await this.addressRepo.save(a);
    await this.updateCustomerDefaultIds(customerId);
    return saved;
  }

  // Contracts
  async listContracts(customerId: string, status?: ContractStatus, effectiveAt?: string) {
    await this.ensureCustomer(customerId);
    const qb = this.contractRepo
      .createQueryBuilder('ct')
      .leftJoinAndSelect('ct.contractCourse', 'cc')
      .where('ct."customerId" = :id', { id: customerId });
    if (status) qb.andWhere('ct.status = :st', { st: status });
    if (effectiveAt) qb.andWhere('ct."startDate" <= :d AND (:d < ct."endDate" OR ct."endDate" IS NULL)', { d: effectiveAt });
    const rows = await qb.getMany();
    return rows.map((ct) => this.toContractDto(ct));
  }

  async getContractDetail(customerId: string, contractId: string) {
    await this.ensureCustomer(customerId);
    const contract = await this.contractRepo.findOne({
      where: { contractId, customer: { id: customerId } as any },
      relations: ['contractCourse'],
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return this.toContractDto(contract);
  }

  async addContract(customerId: string, body: any) {
    await this.ensureCustomer(customerId);
    const startDate = this.reqDate(body.startDate, 'startDate');
    const endDate = body.endDate ? this.reqDate(body.endDate, 'endDate') : null;
    if (endDate && !(startDate < endDate)) throw new BadRequestException('endDate must be greater than startDate');
    const status: ContractStatusEnum = ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(body.status)
      ? (body.status as ContractStatusEnum)
      : ContractStatusEnum.ACTIVE;

    const contractNo = body.contractNo ?? body.contractCode ?? null;
    const courseId = body.contractCourseMstId ?? body.contractCourseId ?? null;
    let course: ContractCourse | null = null;
    if (courseId) {
      course = await this.contractCourseRepo.findOne({ where: { contractCourseId: String(courseId) } });
      if (!course) throw new NotFoundException('Contract course master not found');
    }

    const totalNum = this.reqPositiveInt(body.totalNum, 'totalNum');
    const usedNum = this.reqPositiveInt(body.usedNum ?? 0, 'usedNum', true);
    if (usedNum > totalNum) throw new BadRequestException('usedNum cannot exceed totalNum');
    const totalPrice = this.reqMoney(body.totalPrice, 'totalPrice');
    const discountRate = this.reqDiscountRate(body.discountRate ?? 0);
    const discountPrice = body.discountPrice !== undefined
      ? this.reqMoney(body.discountPrice, 'discountPrice')
      : Number((totalPrice || 0) / Math.max(totalNum, 1));
    const adjustPrice = body.adjustPrice !== undefined ? this.reqMoney(body.adjustPrice, 'adjustPrice') : 0;
    const expirationDate = this.reqDate(body.expirationDate ?? body.endDate ?? startDate, 'expirationDate');
    if (expirationDate && !(this.dateToYMD(startDate) <= this.dateToYMD(expirationDate))) {
      throw new BadRequestException('expirationDate must be on or after startDate');
    }
    const extensionDate = body.extensionDate ? this.reqDate(body.extensionDate, 'extensionDate') : null;
    if (extensionDate && expirationDate && this.dateToYMD(extensionDate) < this.dateToYMD(expirationDate)) {
      throw new BadRequestException('extensionDate must be on or after expirationDate');
    }
    const cancelId = body.cancelId ?? null;

    // Overlap protection
    const existing = await this.contractRepo.find({ where: { customer: { id: customerId } as any } });
    for (const ct of existing) {
      const aStart = this.dateToYMD(ct.startDate);
      const aEnd = ct.endDate ? this.dateToYMD(ct.endDate) : null;
      if (this.rangesOverlap(aStart, aEnd, startDate, endDate)) {
        throw new ConflictException('Contract date range overlap');
      }
    }

    const entity = this.contractRepo.create({
      customer: { id: customerId } as any,
      contractCode: body.contractCode ?? null,
      contractNo,
      startDate: startDate as any,
      endDate: (endDate as any) ?? null,
      status,
      autoRenew: Boolean(body.autoRenew),
      note: body.note ?? null,
      contractCourse: course ? ({ contractCourseId: course.contractCourseId } as any) : null,
      contractCourseMstId: course?.contractCourseId ?? courseId ?? null,
      totalNum,
      usedNum,
      totalPrice: String(totalPrice),
      discountRate: String(discountRate),
      discountPrice: String(discountPrice),
      adjustPrice: String(adjustPrice),
      expirationDate: expirationDate as any,
      extensionDate: (extensionDate as any) ?? null,
      cancelId,
    });
    const saved = await this.contractRepo.save(entity);
    return this.toContractDto({
      ...saved,
      contractCourse: course ?? (entity as any).contractCourse ?? null,
    } as any);
  }

  async editContract(customerId: string, contractId: string, body: any) {
    await this.ensureCustomer(customerId);
    const c = await this.contractRepo.findOne({
      where: { contractId, customer: { id: customerId } as any },
      relations: ['contractCourse'],
    });
    if (!c) throw new NotFoundException('Contract not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== c.version) throw new ConflictException('Version mismatch');

    const nextTotalNum = body.totalNum !== undefined ? this.reqPositiveInt(body.totalNum, 'totalNum') : Number((c as any).totalNum || 0);
    const nextUsedNum = body.usedNum !== undefined ? this.reqPositiveInt(body.usedNum, 'usedNum', true) : Number((c as any).usedNum || 0);
    if (nextUsedNum > nextTotalNum) throw new BadRequestException('usedNum cannot exceed totalNum');
    (c as any).totalNum = nextTotalNum;
    (c as any).usedNum = nextUsedNum;

    if (body.contractCourseMstId !== undefined || body.contractCourseId !== undefined) {
      const courseId = body.contractCourseMstId ?? body.contractCourseId;
      if (courseId === null || courseId === '') {
        (c as any).contractCourse = null;
        (c as any).contractCourseMstId = null;
      } else {
        const course = await this.contractCourseRepo.findOne({ where: { contractCourseId: String(courseId) } });
        if (!course) throw new NotFoundException('Contract course master not found');
        (c as any).contractCourse = course as any;
        (c as any).contractCourseMstId = course.contractCourseId;
      }
    }

    if (body.contractNo !== undefined) c.contractNo = body.contractNo ?? null;
    if (body.totalPrice !== undefined) (c as any).totalPrice = String(this.reqMoney(body.totalPrice, 'totalPrice'));
    if (body.discountRate !== undefined) (c as any).discountRate = String(this.reqDiscountRate(body.discountRate));
    if (body.discountPrice !== undefined) (c as any).discountPrice = String(this.reqMoney(body.discountPrice, 'discountPrice'));
    if (body.adjustPrice !== undefined) (c as any).adjustPrice = String(this.reqMoney(body.adjustPrice, 'adjustPrice'));

    if (body.endDate !== undefined) {
      const newEnd = body.endDate ? this.reqDate(body.endDate, 'endDate') : null;
      if (newEnd && !(this.dateToYMD(c.startDate) < newEnd)) throw new BadRequestException('endDate must be greater than startDate');
      const others = await this.contractRepo.find({ where: { customer: { id: customerId } as any } });
      for (const ct of others) {
        if (ct.contractId === c.contractId) continue;
        const aStart = this.dateToYMD(ct.startDate);
        const aEnd = ct.endDate ? this.dateToYMD(ct.endDate) : null;
        if (this.rangesOverlap(aStart, aEnd, this.dateToYMD(c.startDate), newEnd)) {
          throw new ConflictException('Contract date range overlap');
        }
      }
      c.endDate = (newEnd as any) ?? null;
    }

    if (body.expirationDate !== undefined) {
      const newExp = body.expirationDate ? this.reqDate(body.expirationDate, 'expirationDate') : null;
      if (newExp && !(this.dateToYMD(c.startDate) <= newExp)) {
        throw new BadRequestException('expirationDate must be on or after startDate');
      }
      (c as any).expirationDate = newExp as any;
    }

    const effectiveExpiration = body.expirationDate
      ? this.reqDate(body.expirationDate, 'expirationDate')
      : (c as any).expirationDate ?? null;
    if (body.extensionDate !== undefined) {
      const newExt = body.extensionDate ? this.reqDate(body.extensionDate, 'extensionDate') : null;
      if (newExt && effectiveExpiration && this.dateToYMD(newExt) < this.dateToYMD(effectiveExpiration)) {
        throw new BadRequestException('extensionDate must be on or after expirationDate');
      }
      (c as any).extensionDate = newExt as any;
    }

    if (body.cancelId !== undefined) (c as any).cancelId = body.cancelId ?? null;
    if (['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(body.status)) (c as any).status = body.status;
    if (body.autoRenew !== undefined) c.autoRenew = Boolean(body.autoRenew);
    if (body.note !== undefined) c.note = body.note ?? null;

    const saved = await this.contractRepo.save(c);
    return this.getContractDetail(customerId, saved.contractId);
  }

  async addReverberation(customerId: string, body: any) {
    await this.ensureCustomer(customerId);

    const entity = this.reverberationRepo.create({
      customer: { id: customerId } as any,
      lastVisitDate: body.lastVisitDate ?? null,
      firstVisitDate: body.firstVisitDate ?? null,
      firstPersonStaffId: body.firstPersonStaffId ?? null,
      mediaId: body.mediaId ?? null,
      courseCategoryId: body.courseCategoryId ?? null,
      contractCourseMstId: body.contractCourseMstId ?? null,
      reverberationDate: body.reverberationDate
        ? new Date(body.reverberationDate)
        : new Date(),
    });

    return this.reverberationRepo.save(entity);
  }

  private toContractDto(ct: CustomerContract) {
    const totalNum = Number((ct as any).totalNum ?? 0);
    const usedNum = Number((ct as any).usedNum ?? 0);
    const discountPrice = Number((ct as any).discountPrice ?? 0);
    const adjustPrice = Number((ct as any).adjustPrice ?? 0);
    const totalPrice = Number((ct as any).totalPrice ?? 0);
    const remainingNum = Math.max(totalNum - usedNum, 0);
    const usedAmount = usedNum === totalNum ? usedNum * discountPrice + adjustPrice : usedNum * discountPrice;
    const remainingPrice = totalPrice - usedAmount;

    return {
      ...ct,
      totalNum,
      usedNum,
      discountPrice,
      adjustPrice,
      totalPrice,
      remainingNum,
      remainingPrice,
      usedAmount,
      contractCourseName: (ct as any).contractCourse?.courseName ?? null,
      contractCourseCode: (ct as any).contractCourse?.courseCode ?? null,
    } as any;
  }

  // Helpers
  private async ensureCustomer(id: string) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  private async demoteOtherPrimaryContact(customerId: string, exceptId?: string) {
    const q = this.contactRepo
      .createQueryBuilder()
      .update(CustomerContact)
      .set({ isPrimary: false })
      .where('"customerId" = :id', { id: customerId });
    if (exceptId) q.andWhere('"contactId" <> :cid', { cid: exceptId });
    await q.execute();
  }

  private async clearDefaultAddress(customerId: string, type: AddressType, exceptId?: string) {
    const q = this.addressRepo
      .createQueryBuilder()
      .update(CustomerAddress)
      .set({ isDefault: false })
      .where('"customerId" = :id', { id: customerId })
      .andWhere('type = :t', { t: type });
    if (exceptId) q.andWhere('"addressId" <> :aid', { aid: exceptId });
    await q.execute();
  }

  private async updateCustomerDefaultIds(customerId: string) {
    const c = await this.ensureCustomer(customerId);
    const billing = await this.addressRepo.findOne({ where: { customer: { id: customerId } as any, type: AddressTypeEnum.BILLING, isDefault: true } });
    const shipping = await this.addressRepo.findOne({ where: { customer: { id: customerId } as any, type: AddressTypeEnum.SHIPPING, isDefault: true } });
    c.defaultBillingAddressId = billing ? billing.addressId : null;
    c.defaultShippingAddressId = shipping ? shipping.addressId : null;
    await this.customerRepo.save(c);
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }
  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    return v;
  }
  private reqPositiveInt(v: any, field: string, allowZero = false) {
    const n = Number(v);
    const ok = Number.isInteger(n) && (allowZero ? n >= 0 : n > 0);
    if (!ok) throw new BadRequestException(`${field} must be ${allowZero ? '>= 0' : '> 0'} integer`);
    return n;
  }
  private reqMoney(v: any, field: string) {
    if (v === undefined || v === null || v === '') throw new BadRequestException(`${field} is required`);
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be numeric`);
    return Number(n.toFixed(2));
  }
  private reqDiscountRate(v: any) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new BadRequestException('discountRate must be between 0 and 100');
    return Number(n.toFixed(2));
  }
  private optEmail(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('email must be string');
    const s = v.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(s)) throw new BadRequestException('email is invalid');
    return s;
  }
  private optPhone(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('phone must be string');
    const s = v.trim();
    const re = /^\+?[0-9]{7,15}$/;
    if (!re.test(s)) throw new BadRequestException('phone is invalid');
    return s;
  }
  private optNumber(v: any) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException('number field is invalid');
    return n;
  }
  private dateToYMD(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') {
      return d.includes('/') ? d.replace(/\//g, '-') : d;
    }
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  private reqAddressType(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('type must be string');
    const s = v.trim().toUpperCase();
    if (s === 'BILLING' || s === 'SHIPPING' || s === 'OFFICE') return s as AddressType;
    throw new BadRequestException('type must be one of BILLING|SHIPPING|OFFICE');
  }
  private isEffectiveAt(start: string, end: string | null, d: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const startOk = start <= d;
    const endOk = end ? d < end : true;
    return startOk && endOk;
  }
  private rangesOverlap(aStart: string, aEnd: string | null, bStart: string, bEnd: string | null) {
    const aE = aEnd ?? '9999-12-31';
    const bE = bEnd ?? '9999-12-31';
    return aStart < bE && bStart < aE;
  }
}
