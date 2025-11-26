import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationStoreSetting } from '../entities';

@Injectable()
export class ReservationStoreSettingService {
  constructor(
    @InjectRepository(ReservationStoreSetting)
    private readonly repo: Repository<ReservationStoreSetting>,
  ) {}

  async getForOrg(orgId: string) {
    const id = this.reqString(orgId, 'orgId');
    const rec = await this.repo.findOne({ where: { org: { id } as any } });
    if (!rec) throw new NotFoundException('ReservationStoreSetting not found');
    return rec;
  }

  async upsert(orgId: string, body: any) {
    const id = this.reqString(orgId, 'orgId');
    let rec = await this.repo.findOne({ where: { org: { id } as any } });

    if (rec) {
      const ifMatchVersion: number | undefined = body.ifMatchVersion;
      if (typeof ifMatchVersion === 'number' && ifMatchVersion !== rec.version) {
        throw new ConflictException('Version mismatch');
      }
    }

    const possibleDayCode = this.reqDayCode(body.possibleDayCode, 'possibleDayCode');
    const possibleMonthCode = this.reqMonthCode(body.possibleMonthCode, 'possibleMonthCode');

    const publicHoliday = this.reqBool(body.publicHoliday, 'publicHoliday');
    const regularHolidayMonday = this.reqBool(body.regularHolidayMonday, 'regularHolidayMonday');
    const regularHolidayTuesday = this.reqBool(body.regularHolidayTuesday, 'regularHolidayTuesday');
    const regularHolidayWednesday = this.reqBool(body.regularHolidayWednesday, 'regularHolidayWednesday');
    const regularHolidayThursday = this.reqBool(body.regularHolidayThursday, 'regularHolidayThursday');
    const regularHolidayFriday = this.reqBool(body.regularHolidayFriday, 'regularHolidayFriday');
    const regularHolidaySaturday = this.reqBool(body.regularHolidaySaturday, 'regularHolidaySaturday');
    const regularHolidaySunday = this.reqBool(body.regularHolidaySunday, 'regularHolidaySunday');

    const weekDayBiztimeStart = this.reqTime(body.weekDayBiztimeStart, 'weekDayBiztimeStart');
    const weekDayBiztimeEnd = this.reqTime(body.weekDayBiztimeEnd, 'weekDayBiztimeEnd');
    const weekendDayBiztimeStart = this.reqTime(body.weekendDayBiztimeStart, 'weekendDayBiztimeStart');
    const weekendDayBiztimeEnd = this.reqTime(body.weekendDayBiztimeEnd, 'weekendDayBiztimeEnd');
    const holidayBiztimeStart = this.reqTime(body.holidayBiztimeStart, 'holidayBiztimeStart');
    const holidayBiztimeEnd = this.reqTime(body.holidayBiztimeEnd, 'holidayBiztimeEnd');

    const specialHolidays = this.reqArray(body.specialHolidays, 'specialHolidays');
    const frameRequests = this.reqArray(body.frameRequests, 'frameRequests');
    const mailAddress = this.reqArray(body.mailAddress, 'mailAddress');

    if (!rec) {
      rec = this.repo.create({
        org: { id } as any,
        possibleDayCode,
        possibleMonthCode,
        publicHoliday,
        regularHolidayMonday,
        regularHolidayTuesday,
        regularHolidayWednesday,
        regularHolidayThursday,
        regularHolidayFriday,
        regularHolidaySaturday,
        regularHolidaySunday,
        weekDayBiztimeStart,
        weekDayBiztimeEnd,
        weekendDayBiztimeStart,
        weekendDayBiztimeEnd,
        holidayBiztimeStart,
        holidayBiztimeEnd,
        specialHolidays,
        frameRequests,
        mailAddress,
      });
    } else {
      rec.possibleDayCode = possibleDayCode;
      rec.possibleMonthCode = possibleMonthCode;
      rec.publicHoliday = publicHoliday;
      rec.regularHolidayMonday = regularHolidayMonday;
      rec.regularHolidayTuesday = regularHolidayTuesday;
      rec.regularHolidayWednesday = regularHolidayWednesday;
      rec.regularHolidayThursday = regularHolidayThursday;
      rec.regularHolidayFriday = regularHolidayFriday;
      rec.regularHolidaySaturday = regularHolidaySaturday;
      rec.regularHolidaySunday = regularHolidaySunday;
      rec.weekDayBiztimeStart = weekDayBiztimeStart;
      rec.weekDayBiztimeEnd = weekDayBiztimeEnd;
      rec.weekendDayBiztimeStart = weekendDayBiztimeStart;
      rec.weekendDayBiztimeEnd = weekendDayBiztimeEnd;
      rec.holidayBiztimeStart = holidayBiztimeStart;
      rec.holidayBiztimeEnd = holidayBiztimeEnd;
      rec.specialHolidays = specialHolidays;
      rec.frameRequests = frameRequests;
      rec.mailAddress = mailAddress;
    }

    const saved = await this.repo.save(rec);
    return saved;
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqBool(v: any, field: string) {
    if (typeof v !== 'boolean') {
      throw new BadRequestException(`field ${field} must be boolean`);
    }
    return v;
  }

  private reqTime(v: any, field: string) {
    if (typeof v !== 'string') {
      throw new BadRequestException(`field ${field} must be string 'HH:mm'`);
    }
    const s = v.trim();
    if (!/^\d{2}:\d{2}$/.test(s)) {
      throw new BadRequestException(`field ${field} must be in HH:mm format`);
    }
    return s;
  }

  private reqDayCode(v: any, field: string) {
    if (typeof v !== 'string' && typeof v !== 'number') {
      throw new BadRequestException(`field ${field} must be string or number`);
    }
    const s = String(v).trim();
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      throw new BadRequestException(`field ${field} must be integer 1..31`);
    }
    return s;
  }

  private reqMonthCode(v: any, field: string) {
    if (typeof v !== 'string' && typeof v !== 'number') {
      throw new BadRequestException(`field ${field} must be string or number`);
    }
    const s = String(v).trim();
    if (!['0', '1', '2'].includes(s)) {
      throw new BadRequestException(`field ${field} must be one of '0' | '1' | '2'`);
    }
    return s;
  }

  private reqArray(v: any, field: string) {
    if (!Array.isArray(v)) {
      throw new BadRequestException(`field ${field} must be array`);
    }
    return v;
  }
}
