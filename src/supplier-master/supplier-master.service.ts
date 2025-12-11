import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Supplier,
  SupplierAddress,
  SupplierAddressTypeEnum,
  SupplierContact,
  SupplierStatusEnum,
} from '../entities';

type Status = 'ACTIVE' | 'INACTIVE';

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: Status;
  tags?: string; // CSV
  sortBy?: 'supplierCode' | 'supplierName' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SupplierMasterService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierContact)
    private readonly contactRepo: Repository<SupplierContact>,
    @InjectRepository(SupplierAddress)
    private readonly addressRepo: Repository<SupplierAddress>,
  ) { }

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    const qb = this.supplierRepo.createQueryBuilder('s');
    if (query.search) {
      qb.andWhere(
        "(s.supplierCode ILIKE :s OR s.supplierName ILIKE :s OR COALESCE(s.email,'') ILIKE :s OR COALESCE(s.phone,'') ILIKE :s)",
        { s: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.tags) {
      const tags = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        qb.andWhere('s.tags @> :tags::jsonb', { tags: JSON.stringify(tags) });
      }
    }
    const sortMap: Record<string, string> = {
      supplierCode: 's.supplierCode',
      supplierName: 's.supplierName',
      updatedAt: 's.updatedAt',
    };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 's.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async lookup(search?: string, limit?: number) {
    const take = limit && limit > 0 ? Math.min(limit, 50) : 20;
    const qb = this.supplierRepo.createQueryBuilder('s').where('s.status = :st', { st: SupplierStatusEnum.ACTIVE });
    if (search) {
      qb.andWhere('(s.supplierCode ILIKE :s OR s.supplierName ILIKE :s)', { s: `%${search}%` });
    }
    const rows = await qb.orderBy('s.supplierName', 'ASC').take(take).getMany();
    return rows.map((r) => ({
      id: r.id,
      supplierCode: r.supplierCode,
      supplierName: r.supplierName,
      status: r.status,
    }));
  }

  async getOne(id: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id }, relations: ['contacts', 'addresses'] });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async add(body: any) {
    const supplierCode = this.reqString(body.supplierCode, 'supplierCode');
    const supplierName = this.reqString(body.supplierName, 'supplierName');
    const status: SupplierStatusEnum = body.status === 'INACTIVE' ? SupplierStatusEnum.INACTIVE : SupplierStatusEnum.ACTIVE;

    const dup = await this.supplierRepo.findOne({ where: { supplierCode } });
    if (dup) throw new ConflictException('supplierCode already exists');

    const entity = this.supplierRepo.create({
      supplierCode,
      supplierName,
      status,
      email: body.email ? this.optEmail(body.email) : null,
      phone: body.phone ? this.optPhone(body.phone) : null,
      fax: body.fax ? this.optPhone(body.fax) : null,
      taxCode: body.taxCode ?? null,
      website: body.website ?? null,
      paymentTermDays: body.paymentTermDays != null ? this.reqPositiveInt(body.paymentTermDays, 'paymentTermDays', true) : null,
      creditLimit: body.creditLimit != null ? String(this.optNumber(body.creditLimit, 'creditLimit')) : null,
      tags: body.tags !== undefined ? this.normalizeTags(body.tags) : null,
      note: body.note ?? null,
      defaultBillingAddressId: null,
      defaultShippingAddressId: null,
    });

    const saved = await this.supplierRepo.save(entity);

    if (Array.isArray(body.addresses)) {
      for (const addr of body.addresses) {
        await this.addAddress(saved.id, addr);
      }
    }
    if (Array.isArray(body.contacts)) {
      for (const contact of body.contacts) {
        await this.addContact(saved.id, contact);
      }
    }

    await this.updateSupplierDefaultIds(saved.id);
    return this.getOne(saved.id);
  }

  async edit(id: string, body: any) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== supplier.version) {
      throw new ConflictException('Version mismatch');
    }

    if (body.supplierCode !== undefined) {
      const code = this.reqString(body.supplierCode, 'supplierCode');
      const dup = await this.supplierRepo.findOne({ where: { supplierCode: code } });
      if (dup && dup.id !== supplier.id) throw new ConflictException('supplierCode already exists');
      supplier.supplierCode = code;
    }
    if (body.supplierName !== undefined) supplier.supplierName = this.reqString(body.supplierName, 'supplierName');
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') supplier.status = body.status as SupplierStatusEnum;
    if (body.email !== undefined) supplier.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) supplier.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.fax !== undefined) supplier.fax = body.fax ? this.optPhone(body.fax) : null;
    if (body.taxCode !== undefined) supplier.taxCode = body.taxCode ?? null;
    if (body.website !== undefined) supplier.website = body.website ?? null;
    if (body.paymentTermDays !== undefined) supplier.paymentTermDays = body.paymentTermDays != null ? this.reqPositiveInt(body.paymentTermDays, 'paymentTermDays', true) : null;
    if (body.creditLimit !== undefined) supplier.creditLimit = body.creditLimit != null ? String(this.optNumber(body.creditLimit, 'creditLimit')) : null;
    if (body.tags !== undefined) supplier.tags = this.normalizeTags(body.tags);
    if (body.note !== undefined) supplier.note = body.note ?? null;

    return this.supplierRepo.save(supplier);
  }

  // Contacts
  async listContacts(supplierId: string) {
    await this.ensureSupplier(supplierId);
    return this.contactRepo.find({ where: { supplier: { id: supplierId } as any } });
  }

  async addContact(supplierId: string, body: any) {
    await this.ensureSupplier(supplierId);
    const name = this.reqString(body.name, 'name');
    const email = body.email ? this.optEmail(body.email) : null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const fax = body.fax ? this.optPhone(body.fax) : null;
    const isPrimary = Boolean(body.isPrimary);
    if (isPrimary) await this.demoteOtherPrimaryContact(supplierId);
    const contact = this.contactRepo.create({
      supplier: { id: supplierId } as any,
      name,
      email,
      phone,
      fax,
      position: body.position ?? null,
      department: body.department ?? null,
      isPrimary,
    });
    return this.contactRepo.save(contact);
  }

  async editContact(supplierId: string, contactId: string, body: any) {
    await this.ensureSupplier(supplierId);
    const rec = await this.contactRepo.findOne({ where: { contactId, supplier: { id: supplierId } as any } });
    if (!rec) throw new NotFoundException('Contact not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== rec.version) throw new ConflictException('Version mismatch');

    if (body.name !== undefined) rec.name = this.reqString(body.name, 'name');
    if (body.email !== undefined) rec.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) rec.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.fax !== undefined) rec.fax = body.fax ? this.optPhone(body.fax) : null;
    if (body.position !== undefined) rec.position = body.position ?? null;
    if (body.department !== undefined) rec.department = body.department ?? null;
    if (body.isPrimary !== undefined) {
      const setPrimary = Boolean(body.isPrimary);
      if (setPrimary) await this.demoteOtherPrimaryContact(supplierId, rec.contactId);
      rec.isPrimary = setPrimary;
    }

    return this.contactRepo.save(rec);
  }

  // Addresses
  async listAddresses(supplierId: string) {
    await this.ensureSupplier(supplierId);
    return this.addressRepo.find({ where: { supplier: { id: supplierId } as any } });
  }

  async addAddress(supplierId: string, body: any) {
    await this.ensureSupplier(supplierId);
    const type = this.reqAddressType(body.type);
    const isDefault = Boolean(body.isDefault);
    if (isDefault) await this.clearDefaultAddress(supplierId, type);
    const addr = this.addressRepo.create({
      supplier: { id: supplierId } as any,
      type,
      postalCode: body.postalCode ?? null,
      prefecture: body.prefecture ?? null,
      city: body.city ?? null,
      street: body.street ?? null,
      building: body.building ?? null,
      country: body.country ?? null,
      note: body.note ?? null,
      isDefault,
    });
    const saved = await this.addressRepo.save(addr);
    await this.updateSupplierDefaultIds(supplierId);
    return saved;
  }

  async editAddress(supplierId: string, addressId: string, body: any) {
    await this.ensureSupplier(supplierId);
    const a = await this.addressRepo.findOne({ where: { addressId, supplier: { id: supplierId } as any } });
    if (!a) throw new NotFoundException('Address not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== a.version) throw new ConflictException('Version mismatch');

    let nextType = a.type as SupplierAddressTypeEnum;
    if (body.type !== undefined) {
      nextType = this.reqAddressType(body.type) as SupplierAddressTypeEnum;
      if (a.isDefault) await this.clearDefaultAddress(supplierId, nextType, addressId);
      a.type = nextType;
    }
    if (body.postalCode !== undefined) a.postalCode = body.postalCode ?? null;
    if (body.prefecture !== undefined) a.prefecture = body.prefecture ?? null;
    if (body.city !== undefined) a.city = body.city ?? null;
    if (body.street !== undefined) a.street = body.street ?? null;
    if (body.building !== undefined) a.building = body.building ?? null;
    if (body.country !== undefined) a.country = body.country ?? null;
    if (body.note !== undefined) a.note = body.note ?? null;
    if (body.isDefault !== undefined) {
      const setDefault = Boolean(body.isDefault);
      if (setDefault) await this.clearDefaultAddress(supplierId, nextType, addressId);
      a.isDefault = setDefault;
    }

    const saved = await this.addressRepo.save(a);
    await this.updateSupplierDefaultIds(supplierId);
    return saved;
  }

  private async ensureSupplier(id: string) {
    const s = await this.supplierRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  private async demoteOtherPrimaryContact(supplierId: string, exceptId?: string) {
    const qb = this.contactRepo
      .createQueryBuilder()
      .update(SupplierContact)
      .set({ isPrimary: false })
      .where('"supplierId" = :id', { id: supplierId });
    if (exceptId) qb.andWhere('"contactId" <> :cid', { cid: exceptId });
    await qb.execute();
  }

  private async clearDefaultAddress(supplierId: string, type: SupplierAddressTypeEnum, exceptId?: string) {
    const qb = this.addressRepo
      .createQueryBuilder()
      .update(SupplierAddress)
      .set({ isDefault: false })
      .where('"supplierId" = :id', { id: supplierId })
      .andWhere('type = :t', { t: type });
    if (exceptId) qb.andWhere('"addressId" <> :aid', { aid: exceptId });
    await qb.execute();
  }

  private async updateSupplierDefaultIds(supplierId: string) {
    const supplier = await this.ensureSupplier(supplierId);
    const billing = await this.addressRepo.findOne({
      where: { supplier: { id: supplierId } as any, type: SupplierAddressTypeEnum.BILLING, isDefault: true },
    });
    const shipping = await this.addressRepo.findOne({
      where: { supplier: { id: supplierId } as any, type: SupplierAddressTypeEnum.SHIPPING, isDefault: true },
    });
    supplier.defaultBillingAddressId = billing ? billing.addressId : null;
    supplier.defaultShippingAddressId = shipping ? shipping.addressId : null;
    await this.supplierRepo.save(supplier);
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }

  private reqPositiveInt(v: any, field: string, allowZero = false) {
    const n = Number(v);
    const ok = Number.isInteger(n) && (allowZero ? n >= 0 : n > 0);
    if (!ok) throw new BadRequestException(`${field} must be ${allowZero ? '>= 0' : '> 0'} integer`);
    return n;
  }

  private optEmail(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('email must be string');
    const s = v.trim();
    // const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    // if (!re.test(s)) throw new BadRequestException('email is invalid');
    return s;
  }

  private optPhone(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('phone must be string');
    const s = v.trim();
    // const re = /^\\+?[0-9]{7,15}$/;
    // if (!re.test(s)) throw new BadRequestException('phone is invalid');
    return s;
  }

  private optNumber(v: any, field: string) {
    if (v === null || v === undefined || v === '') throw new BadRequestException(`${field} is required`);
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be numeric`);
    return n;
  }

  private normalizeTags(v: any) {
    if (v === null) return null;
    if (v === undefined) return null;
    if (Array.isArray(v)) return v.map((x) => String(x));
    throw new BadRequestException('tags must be array');
  }

  private reqAddressType(v: any): SupplierAddressTypeEnum {
    if (typeof v !== 'string') throw new BadRequestException('type must be string');
    const s = v.trim().toUpperCase();
    switch (s) {
      case 'BILLING':
        return SupplierAddressTypeEnum.BILLING;
      case 'SHIPPING':
        return SupplierAddressTypeEnum.SHIPPING;
      case 'OFFICE':
        return SupplierAddressTypeEnum.OFFICE;
      case 'WAREHOUSE':
        return SupplierAddressTypeEnum.WAREHOUSE;
      default:
        break;
    }
    throw new BadRequestException('type must be one of BILLING|SHIPPING|OFFICE|WAREHOUSE');
  }
}
