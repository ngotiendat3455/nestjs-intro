import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type AddressType = 'BILLING' | 'SHIPPING' | 'OFFICE';
export type ContractStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Customer {
  id: string;
  customerCode: string; // unique, immutable
  customerName: string;
  status: CustomerStatus;
  industry?: string | null;
  taxCode?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
  note?: string | null;
  paymentTermDays?: number | null;
  creditLimit?: number | null;
  defaultBillingAddressId?: string | null;
  defaultShippingAddressId?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Contact {
  contactId: string;
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Address {
  addressId: string;
  customerId: string;
  type: AddressType;
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  street?: string | null;
  building?: string | null;
  country?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Contract {
  contractId: string;
  customerId: string;
  contractCode?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  status: ContractStatus;
  autoRenew?: boolean | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

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
  private customers: Customer[] = [];
  private contacts: Contact[] = [];
  private addresses: Address[] = [];
  private contracts: Contract[] = [];

  private custCounter = 1;
  private contactCounter = 1;
  private addressCounter = 1;
  private contractCounter = 1;

  // Customers
  list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    let data = [...this.customers];

    if (query.search) {
      const s = query.search.toLowerCase();
      data = data.filter((x) =>
        x.customerCode.toLowerCase().includes(s) ||
        x.customerName.toLowerCase().includes(s) ||
        (x.email ?? '').toLowerCase().includes(s) ||
        (x.phone ?? '').toLowerCase().includes(s),
      );
    }
    if (query.status) data = data.filter((x) => x.status === query.status);
    if (query.industry) data = data.filter((x) => (x.industry ?? '') === query.industry);
    if (query.tags) {
      const tags = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        data = data.filter((x) => tags.every((t) => (x.tags ?? []).includes(t)));
      }
    }
    if (query.contractActiveAt) {
      const d = query.contractActiveAt;
      data = data.filter((c) =>
        this.contracts.some(
          (ct) => ct.customerId === c.id && this.isEffectiveAt(ct.startDate, ct.endDate ?? null, d),
        ),
      );
    }

    if (query.sortBy) {
      const dir = query.sortOrder === 'desc' ? -1 : 1;
      const key = query.sortBy;
      data.sort((a, b) => {
        const va = (a as any)[key] ?? '';
        const vb = (b as any)[key] ?? '';
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);
    return { data: pageData, page, pageSize, total, hasMore: start + pageSize < total };
  }

  getOne(id: string) {
    const c = this.customers.find((x) => x.id === id);
    if (!c) throw new NotFoundException('Customer not found');
    return {
      ...c,
      contacts: this.contacts.filter((y) => y.customerId === id),
      addresses: this.addresses.filter((y) => y.customerId === id),
      contracts: this.contracts.filter((y) => y.customerId === id),
    };
  }

  add(body: any) {
    const customerCode = this.reqString(body.customerCode, 'customerCode');
    const customerName = this.reqString(body.customerName, 'customerName');
    const status: CustomerStatus = body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (this.customers.find((x) => x.customerCode === customerCode)) {
      throw new ConflictException('customerCode already exists');
    }

    const now = new Date().toISOString();
    const record: Customer = {
      id: this.genCustomerId(),
      customerCode,
      customerName,
      status,
      industry: body.industry ?? null,
      taxCode: body.taxCode ?? null,
      website: body.website ?? null,
      email: body.email ? this.optEmail(body.email) : null,
      phone: body.phone ? this.optPhone(body.phone) : null,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      note: body.note ?? null,
      paymentTermDays: this.optNumber(body.paymentTermDays),
      creditLimit: this.optNumber(body.creditLimit),
      defaultBillingAddressId: null,
      defaultShippingAddressId: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.customers.push(record);
    return record;
  }

  edit(id: string, body: any) {
    const c = this.customers.find((x) => x.id === id);
    if (!c) throw new NotFoundException('Customer not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== c.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.customerName === 'string' && body.customerName.trim().length > 0) c.customerName = body.customerName.trim();
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') c.status = body.status;
    if (body.industry !== undefined) c.industry = body.industry ?? null;
    if (body.taxCode !== undefined) c.taxCode = body.taxCode ?? null;
    if (body.website !== undefined) c.website = body.website ?? null;
    if (body.email !== undefined) c.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) c.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.tags !== undefined) c.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    if (body.note !== undefined) c.note = body.note ?? null;
    if (body.paymentTermDays !== undefined) c.paymentTermDays = this.optNumber(body.paymentTermDays);
    if (body.creditLimit !== undefined) c.creditLimit = this.optNumber(body.creditLimit);

    c.updatedAt = new Date().toISOString();
    c.version += 1;
    return c;
  }

  // Contacts
  listContacts(customerId: string) {
    this.ensureCustomer(customerId);
    return this.contacts.filter((x) => x.customerId === customerId);
  }

  addContact(customerId: string, body: any) {
    const customer = this.ensureCustomer(customerId);
    const name = this.reqString(body.name, 'name');
    const email = body.email ? this.optEmail(body.email) : null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const isPrimary = Boolean(body.isPrimary);

    const now = new Date().toISOString();
    const contact: Contact = {
      contactId: this.genContactId(),
      customerId,
      name,
      email,
      phone,
      position: body.position ?? null,
      department: body.department ?? null,
      isPrimary,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    if (isPrimary) this.demoteOtherPrimaryContact(customerId);
    this.contacts.push(contact);
    // set default primary email/phone not linked to customer; we just keep in contacts
    return contact;
  }

  editContact(customerId: string, contactId: string, body: any) {
    this.ensureCustomer(customerId);
    const c = this.contacts.find((x) => x.customerId === customerId && x.contactId === contactId);
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
      if (setPrimary) this.demoteOtherPrimaryContact(customerId, contactId);
      c.isPrimary = setPrimary;
    }

    c.updatedAt = new Date().toISOString();
    c.version += 1;
    return c;
  }

  // Addresses
  listAddresses(customerId: string) {
    this.ensureCustomer(customerId);
    return this.addresses.filter((x) => x.customerId === customerId);
  }

  addAddress(customerId: string, body: any) {
    this.ensureCustomer(customerId);
    const type = this.reqAddressType(body.type);
    const isDefault = Boolean(body.isDefault);
    const now = new Date().toISOString();
    const addr: Address = {
      addressId: this.genAddressId(),
      customerId,
      type,
      postalCode: body.postalCode ?? null,
      prefecture: body.prefecture ?? null,
      city: body.city ?? null,
      street: body.street ?? null,
      building: body.building ?? null,
      country: body.country ?? null,
      isDefault,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    if (isDefault) this.clearDefaultAddress(customerId, type);
    this.addresses.push(addr);
    this.updateCustomerDefaultIds(customerId);
    return addr;
  }

  editAddress(customerId: string, addressId: string, body: any) {
    this.ensureCustomer(customerId);
    const a = this.addresses.find((x) => x.customerId === customerId && x.addressId === addressId);
    if (!a) throw new NotFoundException('Address not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== a.version) throw new ConflictException('Version mismatch');

    if (body.type !== undefined) a.type = this.reqAddressType(body.type);
    if (body.postalCode !== undefined) a.postalCode = body.postalCode ?? null;
    if (body.prefecture !== undefined) a.prefecture = body.prefecture ?? null;
    if (body.city !== undefined) a.city = body.city ?? null;
    if (body.street !== undefined) a.street = body.street ?? null;
    if (body.building !== undefined) a.building = body.building ?? null;
    if (body.country !== undefined) a.country = body.country ?? null;
    if (body.isDefault !== undefined) {
      const setDefault = Boolean(body.isDefault);
      if (setDefault) this.clearDefaultAddress(customerId, a.type, addressId);
      a.isDefault = setDefault;
    }

    a.updatedAt = new Date().toISOString();
    a.version += 1;
    this.updateCustomerDefaultIds(customerId);
    return a;
  }

  // Contracts
  listContracts(customerId: string, status?: ContractStatus, effectiveAt?: string) {
    this.ensureCustomer(customerId);
    let data = this.contracts.filter((x) => x.customerId === customerId);
    if (status) data = data.filter((x) => x.status === status);
    if (effectiveAt) data = data.filter((x) => this.isEffectiveAt(x.startDate, x.endDate ?? null, effectiveAt));
    return data;
  }

  addContract(customerId: string, body: any) {
    this.ensureCustomer(customerId);
    const startDate = this.reqDate(body.startDate, 'startDate');
    const endDate = body.endDate ? this.reqDate(body.endDate, 'endDate') : null;
    if (endDate && !(startDate < endDate)) throw new BadRequestException('endDate must be greater than startDate');
    const status: ContractStatus = ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(body.status)
      ? body.status
      : 'ACTIVE';

    // Overlap protection
    for (const ct of this.contracts.filter((x) => x.customerId === customerId)) {
      if (this.rangesOverlap(ct.startDate, ct.endDate ?? null, startDate, endDate)) {
        throw new ConflictException('Contract date range overlap');
      }
    }

    const now = new Date().toISOString();
    const record: Contract = {
      contractId: this.genContractId(),
      customerId,
      contractCode: body.contractCode ?? null,
      startDate,
      endDate,
      status,
      autoRenew: body.autoRenew ?? null,
      note: body.note ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.contracts.push(record);
    return record;
  }

  editContract(customerId: string, contractId: string, body: any) {
    this.ensureCustomer(customerId);
    const c = this.contracts.find((x) => x.customerId === customerId && x.contractId === contractId);
    if (!c) throw new NotFoundException('Contract not found');
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== c.version) throw new ConflictException('Version mismatch');

    if (body.endDate !== undefined) {
      const newEnd = body.endDate ? this.reqDate(body.endDate, 'endDate') : null;
      if (newEnd && !(c.startDate < newEnd)) throw new BadRequestException('endDate must be greater than startDate');
      // overlap check against others
      for (const ct of this.contracts) {
        if (ct === c) continue;
        if (ct.customerId !== customerId) continue;
        if (this.rangesOverlap(ct.startDate, ct.endDate ?? null, c.startDate, newEnd)) {
          throw new ConflictException('Contract date range overlap');
        }
      }
      c.endDate = newEnd;
    }
    if (['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(body.status)) c.status = body.status;
    if (body.autoRenew !== undefined) c.autoRenew = Boolean(body.autoRenew);
    if (body.note !== undefined) c.note = body.note ?? null;

    c.updatedAt = new Date().toISOString();
    c.version += 1;
    return c;
  }

  // Helpers
  private genCustomerId() {
    const id = `CUS-${String(this.custCounter).padStart(3, '0')}`;
    this.custCounter += 1;
    return id;
  }
  private genContactId() {
    const id = `CTC-${String(this.contactCounter).padStart(3, '0')}`;
    this.contactCounter += 1;
    return id;
  }
  private genAddressId() {
    const id = `ADDR-${String(this.addressCounter).padStart(3, '0')}`;
    this.addressCounter += 1;
    return id;
  }
  private genContractId() {
    const id = `CTR-${String(this.contractCounter).padStart(3, '0')}`;
    this.contractCounter += 1;
    return id;
  }

  private ensureCustomer(id: string) {
    const c = this.customers.find((x) => x.id === id);
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  private demoteOtherPrimaryContact(customerId: string, exceptId?: string) {
    for (const c of this.contacts) {
      if (c.customerId === customerId && c.contactId !== exceptId && c.isPrimary) {
        c.isPrimary = false;
        c.updatedAt = new Date().toISOString();
        c.version += 1;
      }
    }
  }

  private clearDefaultAddress(customerId: string, type: AddressType, exceptId?: string) {
    for (const a of this.addresses) {
      if (a.customerId === customerId && a.type === type && a.addressId !== exceptId && a.isDefault) {
        a.isDefault = false;
        a.updatedAt = new Date().toISOString();
        a.version += 1;
      }
    }
  }

  private updateCustomerDefaultIds(customerId: string) {
    const c = this.ensureCustomer(customerId);
    const billing = this.addresses.find((a) => a.customerId === customerId && a.type === 'BILLING' && a.isDefault);
    const shipping = this.addresses.find((a) => a.customerId === customerId && a.type === 'SHIPPING' && a.isDefault);
    c.defaultBillingAddressId = billing ? billing.addressId : null;
    c.defaultShippingAddressId = shipping ? shipping.addressId : null;
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }
  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    return v;
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

