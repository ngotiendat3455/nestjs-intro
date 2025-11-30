import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerNumberFormatService } from '../customer-number-format/customer-number-format.service';
import {
  ContractCourse,
  CourseGroup,
  Customer,
  Media,
  Org,
  Reservation,
  ReservationStoreSetting,
  ReserveFrame,
  Staff,
} from '../entities';
import { CustomerStatusEnum } from '../entities/customer.entity';

interface CreateReservationDto {
  customerId: string;
  orgId: string;
  contractCourseId: string;
  contractCourseGroupId: string;
  targetDate: string; // YYYY-MM-DD
  desiredTime: string; // HH:mm
  treatmentTime?: number;
  mediaId?: string;
  requests?: string | null;
  managementNumber?: string;
  responsibleStaffId?: string;
  customerClass?: string;
  note?: string;
}

interface ListQuery {
  orgId?: string;
  startDate?: string;
  endDate?: string;
  customerClass?: string;
  keyWord?: string;
  customerBasicDataId?: string;
}

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ContractCourse)
    private readonly courseRepo: Repository<ContractCourse>,
    @InjectRepository(CourseGroup)
    private readonly groupRepo: Repository<CourseGroup>,
    @InjectRepository(ReserveFrame)
    private readonly frameRepo: Repository<ReserveFrame>,
    @InjectRepository(ReservationStoreSetting)
    private readonly storeSettingRepo: Repository<ReservationStoreSetting>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    private readonly numberFmt: CustomerNumberFormatService,
  ) { }

  async createReservation(body: any) {
    const dto: CreateReservationDto = {
      customerId: this.reqString(body.customerId, 'customerId'),
      orgId: this.reqString(body.orgId, 'orgId'),
      contractCourseId: this.reqString(body.contractCourseId, 'contractCourseId'),
      contractCourseGroupId: this.reqString(body.contractCourseGroupId, 'contractCourseGroupId'),
      targetDate: this.reqDate(body.targetDate, 'targetDate'),
      desiredTime: this.reqTime(body.desiredTime, 'desiredTime'),
      treatmentTime: body.treatmentTime !== undefined ? this.reqInt(body.treatmentTime, 'treatmentTime') : undefined,
      mediaId: body.mediaId,
      requests: body.requests ?? null,
      managementNumber: body.managementNumber ?? '',
      responsibleStaffId: body.responsibleStaffId,
      customerClass: body.customerClass,
      note: body.note,
    };

    const [org, customer, course, group] = await Promise.all([
      this.orgRepo.findOne({ where: { id: dto.orgId } }),
      this.customerRepo.findOne({ where: { id: dto.customerId } }),
      this.courseRepo.findOne({ where: { contractCourseId: dto.contractCourseId } }),
      this.groupRepo.findOne({ where: { id: dto.contractCourseGroupId } }),
    ]);
    if (!org) throw new NotFoundException('Org not found');
    if (!customer) throw new NotFoundException('Customer not found');
    if (!course) throw new NotFoundException('ContractCourse not found');
    if (!group) throw new NotFoundException('CourseGroup not found');

    const storeSetting = await this.storeSettingRepo.findOne({
      where: { org: { id: dto.orgId } as any },
    });
    if (!storeSetting) {
      throw new NotFoundException('ReservationStoreSetting not found for org');
    }

    const treatmentTime = dto.treatmentTime ?? 0;
    const timeFrom = dto.desiredTime;
    const timeTo = this.addMinutes(timeFrom, treatmentTime);

    // Find or create ReserveFrame for this org + date + group + time range
    let frame = await this.frameRepo.findOne({
      where: {
        reservationStoreSetting: { id: storeSetting.id } as any,
        courseGroup: { id: dto.contractCourseGroupId } as any,
        targetDate: dto.targetDate as any,
        timeFrom,
        timeTo,
      },
    });

    if (!frame) {
      const qb = this.frameRepo
        .createQueryBuilder('f')
        .select('MAX(f.frameNumber)', 'max')
        .where('f.reservationStoreSettingId = :sid', { sid: storeSetting.id })
        .andWhere('f.targetDate = :d', { d: dto.targetDate })
        .andWhere('f.courseGroupId = :gid', { gid: dto.contractCourseGroupId });
      const raw = await qb.getRawOne<{ max: string | null }>();
      const nextFrameNumber = raw && raw.max ? Number(raw.max) + 1 : 1;

      frame = this.frameRepo.create({
        reservationStoreSetting: { id: storeSetting.id } as any,
        courseGroup: { id: dto.contractCourseGroupId } as any,
        targetDate: dto.targetDate as any,
        frameNumber: nextFrameNumber,
        timeFrom,
        timeTo,
      });
      frame = await this.frameRepo.save(frame);
    }

    let media: Media | null = null;
    if (dto.mediaId) {
      media = await this.mediaRepo.findOne({ where: { mediaId: dto.mediaId } });
      if (!media) throw new NotFoundException('Media not found');
    }

    let staff: Staff | null = null;
    if (dto.responsibleStaffId) {
      staff = await this.staffRepo.findOne({ where: { id: dto.responsibleStaffId } });
      if (!staff) throw new NotFoundException('Staff not found');
    }

    const reservation = this.reservationRepo.create({
      org: { id: dto.orgId } as any,
      customer: { id: dto.customerId } as any,
      contractCourse: { contractCourseId: dto.contractCourseId } as any,
      courseGroup: { id: dto.contractCourseGroupId } as any,
      reserveFrame: { id: frame.id } as any,
      media: media ? ({ mediaId: media.mediaId } as any) : null,
      responsibleStaff: staff ? ({ id: staff.id } as any) : null,
      reserveDay: dto.targetDate as any,
      desiredTime: timeFrom,
      treatmentTime,
      reserveStatusCode: 'RESERVED',
      cancelFlag: false,
      cancelType: 0,
      managementNumber: dto.managementNumber || '',
      customerClass: dto.customerClass ?? null,
      requests: dto.requests ?? null,
      note: dto.note ?? null,
    });

    const saved = await this.reservationRepo.save(reservation);
    return saved;
  }

  async listReservations(query: ListQuery) {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.contractCourse', 'cc')
      .leftJoinAndSelect('r.org', 'o')
      .leftJoinAndSelect('r.media', 'm')
      .leftJoinAndSelect('r.customer', 'c');

    if (query.orgId) {
      qb.andWhere('o.id = :orgId', { orgId: query.orgId });
    }
    if (query.startDate && query.endDate) {
      const start = this.reqDate(query.startDate, 'startDate');
      const end = this.reqDate(query.endDate, 'endDate');
      qb.andWhere('r.reserveDay BETWEEN :start AND :end', { start, end });
    } else if (query.startDate) {
      const start = this.reqDate(query.startDate, 'startDate');
      qb.andWhere('r.reserveDay = :start', { start });
    }
    if (query.customerClass) {
      qb.andWhere('r.customerClass = :cc', { cc: query.customerClass });
    }
    if (query.customerBasicDataId) {
      qb.andWhere('c.id = :cid', { cid: query.customerBasicDataId });
    }
    if (query.keyWord) {
      const s = `%${query.keyWord}%`;
      qb.andWhere(
        '(c.customerName ILIKE :s OR COALESCE(c.email, \'\') ILIKE :s OR COALESCE(c.phone, \'\') ILIKE :s)',
        { s },
      );
    }

    qb.orderBy('r.reserveDay', 'ASC').addOrderBy('r.desiredTime', 'ASC');

    const rows = await qb.getMany();

    // Map to shape similar to IReservationList on FE
    return rows.map((r) => {
      const reserveDay =
        r.reserveDay instanceof Date
          ? r.reserveDay.toISOString().slice(0, 10)
          : (r.reserveDay as string);
      const desiredTime = `${reserveDay}T${r.desiredTime}:00`;

      return {
        reservationInformationId: r.id,
        reserveDay,
        desiredTime,
        courseName: (r.contractCourse as any)?.courseName || '',
        contractCourseId: (r.contractCourse as any)?.contractCourseId || '',
        customerName: (r.customer as any)?.customerName || '',
        customerNameKana: '',
        customerPhoneNumber: (r.customer as any)?.phone || '',
        mailAddress: (r.customer as any)?.email || '',
        mediaId: (r.media as any)?.mediaId || '',
        mediaName: (r.media as any)?.mediaName || '',
        orgId: (r.org as any)?.id || '',
        orgName: (r.org as any)?.orgName || '',
        reserveStatus: {
          code: r.reserveStatusCode,
          value: r.reserveStatusCode,
        },
        treatmentTime: r.treatmentTime,
        cancelFlag: r.cancelFlag,
        cancelType: r.cancelType,
        managementNummber: r.managementNumber,
        requests: r.requests || '',
      };
    });
  }

  async createReservationForNewCustomer(body: any) {
    const orgId = this.reqString(body.orgId, 'orgId');
    const contractCourseId = this.reqString(
      body.contractCourseId,
      'contractCourseId',
    );
    const desiredTimeRaw = this.reqString(
      body.desiredTime,
      'desiredTime',
    ); // 'YYYY-MM-DD HH:mm:ss'
    const [datePart, timePart] = desiredTimeRaw.split(' ');
    if (!datePart || !timePart) {
      throw new BadRequestException(
        'desiredTime must be in format YYYY-MM-DD HH:mm:ss',
      );
    }
    const targetDate = this.reqDate(datePart, 'desiredTime.date');
    const timeFrom = this.reqTime(timePart.slice(0, 5), 'desiredTime.time');
    const treatmentTime =
      body.treatmentTime !== undefined
        ? this.reqInt(body.treatmentTime, 'treatmentTime')
        : 0;
    const courseGroupId = this.reqString(
      body.courseGroupId,
      'courseGroupId',
    );

    // Generate customerCode and create a simple customer
    let customerCode: string | undefined;
    let attempts = 0;
    while (!customerCode) {
      attempts += 1;
      const gen = await this.numberFmt.generate({
        target: 'CUSTOMER_NO',
        orgId,
      });
      const candidate = gen.value;
      const exists = await this.customerRepo.findOne({
        where: { customerCode: candidate },
      });
      if (!exists) {
        customerCode = candidate;
      } else if (attempts >= 3) {
        throw new ConflictException(
          'Unable to allocate unique customerCode for new customer',
        );
      }
    }

    const lastName = typeof body.customerLastName === 'string'
      ? body.customerLastName.trim()
      : '';
    const firstName = typeof body.customerFirstName === 'string'
      ? body.customerFirstName.trim()
      : '';
    const customerName = [lastName, firstName].filter(Boolean).join(' ') || 'NEW CUSTOMER';

    const newCustomer = this.customerRepo.create({
      customerCode,
      customerName,
      status: CustomerStatusEnum.ACTIVE,
      phone:
        typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
          ? body.phoneNumber.trim()
          : null,
    } as any);
    const savedCustomer: any = await this.customerRepo.save(newCustomer);

    const storeSetting = await this.storeSettingRepo.findOne({
      where: { org: { id: orgId } as any },
    });
    if (!storeSetting) {
      throw new NotFoundException(
        'ReservationStoreSetting not found for org',
      );
    }

    const timeTo = this.addMinutes(timeFrom, treatmentTime);

    // Use existing frame if provided and not "0"
    let frame: ReserveFrame | null = null;
    if (body.frameId && String(body.frameId) !== '0') {
      frame = await this.frameRepo.findOne({
        where: { id: String(body.frameId) },
      });
      if (!frame) {
        throw new NotFoundException('ReserveFrame not found');
      }
    } else {
      frame = await this.frameRepo.findOne({
        where: {
          reservationStoreSetting: { id: storeSetting.id } as any,
          courseGroup: { id: courseGroupId } as any,
          targetDate: targetDate as any,
          timeFrom,
          timeTo,
        },
      });

      if (!frame) {
        const qb = this.frameRepo
          .createQueryBuilder('f')
          .select('MAX(f.frameNumber)', 'max')
          .where('f.reservationStoreSettingId = :sid', { sid: storeSetting.id })
          .andWhere('f.targetDate = :d', { d: targetDate })
          .andWhere('f.courseGroupId = :gid', { gid: courseGroupId });
        const raw = await qb.getRawOne<{ max: string | null }>();
        const nextFrameNumber =
          raw && raw.max ? Number(raw.max) + 1 : 1;

        frame = this.frameRepo.create({
          reservationStoreSetting: { id: storeSetting.id } as any,
          courseGroup: { id: courseGroupId } as any,
          targetDate: targetDate as any,
          frameNumber: nextFrameNumber,
          timeFrom,
          timeTo,
        });
        frame = await this.frameRepo.save(frame);
      }
    }

    let media: Media | null = null;
    if (body.mediaCode) {
      media = await this.mediaRepo.findOne({
        where: { mediaCode: String(body.mediaCode) },
      });
      if (!media) {
        throw new NotFoundException('Media not found for mediaCode');
      }
    }

    const reservation = this.reservationRepo.create({
      org: { id: orgId } as any,
      customer: { id: savedCustomer.id } as any,
      contractCourse: { contractCourseId } as any,
      courseGroup: { id: courseGroupId } as any,
      reserveFrame: frame ? ({ id: frame.id } as any) : null,
      media: media ? ({ mediaId: media.mediaId } as any) : null,
      reserveDay: targetDate as any,
      desiredTime: timeFrom,
      treatmentTime,
      reserveStatusCode: 'TEMPORARY_RESERVATION',
      cancelFlag: false,
      cancelType: 0,
      managementNumber: '',
      customerClass: 'NEW_CUSTOMER',
      requests: body.requests ?? null,
      note: null,
    });

    const saved = await this.reservationRepo.save(reservation);

    return {
      customerBasicDataId: savedCustomer.id,
      reservationId: saved.id,
      createDate: saved.createdAt,
      updateDate: saved.updatedAt,
    };
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqInt(v: any, field: string) {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      throw new BadRequestException(`field ${field} must be integer`);
    }
    return n;
  }

  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    }
    return v;
  }

  private reqTime(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v.trim())) {
      throw new BadRequestException(`field ${field} must be HH:mm`);
    }
    return v.trim();
  }

  private addMinutes(time: string, minutes: number): string {
    const [hStr, mStr] = time.split(':');
    const base = Number(hStr) * 60 + Number(mStr);
    const total = base + minutes;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
