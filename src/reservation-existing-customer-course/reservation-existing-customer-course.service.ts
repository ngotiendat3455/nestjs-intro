import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ReservationCourseSetting,
  ReservationCourseSettingOrg,
  ContractCourse,
  Org,
} from '../entities';

interface ListQuery {
  companyCode: string;
  keyWord: string;
}

@Injectable()
export class ReservationExistingCustomerCourseService {
  constructor(
    @InjectRepository(ReservationCourseSetting)
    private readonly courseRepo: Repository<ReservationCourseSetting>,
    @InjectRepository(ReservationCourseSettingOrg)
    private readonly orgLinkRepo: Repository<ReservationCourseSettingOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) {}

  async list(query: ListQuery) {
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .leftJoinAndMapOne(
        'c.contractCourse',
        ContractCourse,
        'cc',
        'cc.contractCourseId = c.courseId',
      )
      .leftJoinAndSelect('c.orgLinks', 'cl')
      .leftJoinAndSelect('cl.org', 'o');

    qb.andWhere('c.customerType = :ct', { ct: 'EXISTING' });

    if (query.companyCode) {
      qb.andWhere('c.companyCode = :cc', { cc: query.companyCode });
    }
    if (query.keyWord) {
      qb.andWhere(
        '(cc.courseCode ILIKE :s OR cc.courseName ILIKE :s)',
        { s: `%${query.keyWord}%` },
      );
    }

    qb.orderBy('c.displaySort', 'ASC');

    const rows = await qb.getMany();

    // Shape matching IReservationExistingClientCourse on FE
    return rows.map((c) => {
      const cc = (c as any).contractCourse as ContractCourse | undefined;

      return {
      classType: c.classType || '',
      companyCode: c.companyCode || '',
      contractCourseCategoryId: c.contractCourseCategoryId || '',
      contractCourseCategoryName: '',
      contractCourseGroupId: c.contractCourseGroupId || '',
      contractCourseGroupName: '',
      courseCode: cc?.courseCode || '',
      courseId: c.courseId,
      courseName: cc?.courseName || '',
      displaySort: c.displaySort,
      timeZone: c.timeZone || '',
      treatmentTime: c.treatmentTime,
      orgs: (c.orgLinks || []).map((l) => ({
        id: {
          orgId: l.org.id,
          companyCode: '',
          applyStartDate: null,
        },
        orgCode: l.org.orgCode,
        orgName: l.org.orgName,
        orgNameKana: '',
        dispOrder: 0,
        applyEndDate: null,
        closeFlag: false,
        category: 0,
        regiAddress: '',
        isExistOrganization: true,
      })),
    };
    });
  }

  async detail(courseId: string) {
    if (!courseId) throw new BadRequestException('courseIds is required');
    const rec = await this.courseRepo
      .createQueryBuilder('c')
      .leftJoinAndMapOne(
        'c.contractCourse',
        ContractCourse,
        'cc',
        'cc.contractCourseId = c.courseId',
      )
      .leftJoinAndSelect('c.orgLinks', 'cl')
      .leftJoinAndSelect('cl.org', 'o')
      .where('c.courseId = :courseId', { courseId })
      .andWhere('c.customerType = :ct', { ct: 'EXISTING' })
      .getOne();
    if (!rec) throw new NotFoundException('Existing customer course not found');

    const cc = (rec as any).contractCourse as ContractCourse | undefined;

    return {
      classType: rec.classType || '',
      companyCode: rec.companyCode || '',
      contractCourseCategoryId: rec.contractCourseCategoryId || '',
      contractCourseCategoryName: '',
      contractCourseGroupId: rec.contractCourseGroupId || '',
      contractCourseGroupName: '',
      courseId: rec.courseId,
      courseCode: cc?.courseCode || '',
      courseName: cc?.courseName || '',
      displaySort: rec.displaySort,
      timeZone: rec.timeZone || '',
      treatmentTime: rec.treatmentTime,
      orgs: (rec.orgLinks || []).map((l) => ({
        id: {
          orgId: l.org.id,
          companyCode: '',
          applyStartDate: null,
        },
        orgCode: l.org.orgCode,
        orgName: l.org.orgName,
        orgNameKana: '',
        dispOrder: 0,
        applyEndDate: null,
        closeFlag: false,
        category: 0,
        regiAddress: '',
        isExistOrganization: true,
      })),
    };
  }

  async upsert(body: any) {
    const courseId = this.reqString(body.courseId, 'courseId');
    const displaySort = this.reqInt(body.displaySort, 'displaySort');
    const treatmentTime = this.reqInt(body.treatmentTime, 'treatmentTime');
    const classType = body.classType ?? null;
    const timeZone = body.timeZone ?? null;
    const contractCourseCategoryId = body.contractCourseCategoryId ?? null;
    const contractCourseGroupId = body.contractCourseCategoryId ?? null;
    const companyCode = body.companyCode ?? null;
    const orgIds: string[] = Array.isArray(body.orgIds)
      ? body.orgIds
      : Array.isArray(body.listOrgId)
      ? body.listOrgId
      : [];

    let rec = await this.courseRepo.findOne({
      where: { courseId, customerType: 'EXISTING' },
    });

    if (!rec) {
      rec = this.courseRepo.create({
        courseId,
        customerType: 'EXISTING',
        displaySort,
        treatmentTime,
        classType,
        timeZone,
        contractCourseCategoryId,
        contractCourseGroupId,
        companyCode,
      });
    } else {
      rec.displaySort = displaySort;
      rec.treatmentTime = treatmentTime;
      rec.classType = classType;
      rec.timeZone = timeZone;
      rec.contractCourseCategoryId = contractCourseCategoryId;
      rec.contractCourseGroupId = contractCourseGroupId;
      rec.companyCode = companyCode;
    }

    const saved = await this.courseRepo.save(rec);

    // update org links
    await this.orgLinkRepo.delete({ setting: { id: saved.id } as any });
    if (orgIds.length) {
      const orgs = await this.orgRepo.find({ where: { id: In(orgIds) } });
      const links = orgs.map((o) =>
        this.orgLinkRepo.create({
          setting: { id: saved.id } as any,
          org: { id: o.id } as any,
        }),
      );
      await this.orgLinkRepo.save(links);
    }

    return this.detail(saved.courseId);
  }

  async delete(courseIds: string[]) {
    if (!courseIds.length) return { deleted: 0 };
    const recs = await this.courseRepo.find({
      where: { courseId: In(courseIds), customerType: 'EXISTING' },
    });
    if (!recs.length) return { deleted: 0 };
    const ids = recs.map((r) => r.id);
    await this.courseRepo.delete({ id: In(ids) });
    return { deleted: ids.length };
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
}
