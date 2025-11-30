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
  keyword: string;
}

@Injectable()
export class ReservationNewCustomerCourseService {
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

    qb.andWhere('c.customerType = :ct', { ct: 'NEW' });

    if (query.keyword) {
      // We don't store courseCode/courseName here; keyword filter can be wired later via join to course master.
    }

    qb.orderBy('c.displaySort', 'ASC');

    const rows = await qb.getMany();

    return rows.map((c) => {
      const cc = (c as any).contractCourse as ContractCourse | undefined;

      return {
        classType: c.classType || '',
        courseId: c.courseId,
        displaySort: c.displaySort,
        timeZone: c.timeZone || '',
        treatmentTime: c.treatmentTime,
        courseCode: cc?.courseCode || '',
        courseName: cc?.courseName || '',
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
    if (!courseId) throw new BadRequestException('courseId is required');
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
      .andWhere('c.customerType = :ct', { ct: 'NEW' })
      .getOne();
    if (!rec) throw new NotFoundException('New customer course not found');

    const cc = (rec as any).contractCourse as ContractCourse | undefined;

    return {
      classType: rec.classType || '',
      courseId: rec.courseId,
      displaySort: rec.displaySort,
      timeZone: rec.timeZone || '',
      treatmentTime: rec.treatmentTime,
      courseCode: cc?.courseCode || '',
      courseName: cc?.courseName || '',
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
    const orgIds: string[] = Array.isArray(body.listOrgId)
      ? body.listOrgId.map((x: any) => x.orgId || x.id?.orgId || x)
      : Array.isArray(body.orgIds)
      ? body.orgIds
      : [];

    let rec = await this.courseRepo.findOne({
      where: { courseId, customerType: 'NEW' },
    });
    if (!rec) {
      rec = this.courseRepo.create({
        courseId,
        customerType: 'NEW',
        displaySort,
        treatmentTime,
        classType,
        timeZone,
      });
    } else {
      rec.displaySort = displaySort;
      rec.treatmentTime = treatmentTime;
      rec.classType = classType;
      rec.timeZone = timeZone;
    }

    const saved = await this.courseRepo.save(rec);

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
      where: { courseId: In(courseIds), customerType: 'NEW' },
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
