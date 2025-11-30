import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractCourse, ContractCourseStatus, CourseCategory, CourseGroup } from '../entities';

type CourseStatus = 'ACTIVE' | 'INACTIVE';

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CourseStatus;
}

@Injectable()
export class CourseMasterService {
  constructor(
    @InjectRepository(ContractCourse)
    private readonly repo: Repository<ContractCourse>,
    @InjectRepository(CourseGroup)
    private readonly groupRepo: Repository<CourseGroup>,
    @InjectRepository(CourseCategory)
    private readonly categoryRepo: Repository<CourseCategory>,
  ) {}

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const qb = this.repo.createQueryBuilder('c');
    if (query.search) {
      qb.andWhere(
        '(c.courseCode ILIKE :s OR c.courseName ILIKE :s OR COALESCE(c.description, \'\') ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }

    qb.orderBy('c.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows,
      page,
      pageSize,
      total,
      hasMore: (page - 1) * pageSize + rows.length < total,
    };
  }

  async getOne(contractCourseId: string) {
    const id = this.reqString(contractCourseId, 'contractCourseId');
    const rec = await this.repo.findOne({ where: { contractCourseId: id } });
    if (!rec) throw new NotFoundException('Course not found');
    return rec;
  }

  async add(body: any) {
    const courseCode = this.reqString(body.courseCode, 'courseCode');
    const courseName = this.reqString(body.courseName, 'courseName');
    const status: ContractCourseStatus =
      body.status === 'INACTIVE' ? ContractCourseStatus.INACTIVE : ContractCourseStatus.ACTIVE;
    const description = body.description ?? null;

    let courseGroup: CourseGroup | null = null;
    if (body.contractCourseGroupId) {
      courseGroup = await this.groupRepo.findOne({ where: { id: String(body.contractCourseGroupId) } });
      if (!courseGroup) throw new NotFoundException('CourseGroup not found');
    }

    let courseCategory: CourseCategory | null = null;
    if (body.contractCourseCategoryId) {
      courseCategory = await this.categoryRepo.findOne({ where: { id: String(body.contractCourseCategoryId) } });
      if (!courseCategory) throw new NotFoundException('CourseCategory not found');
    }

    const dup = await this.repo.findOne({ where: { courseCode } });
    if (dup) throw new ConflictException('courseCode already exists');

    const entity = this.repo.create({
      courseCode,
      courseName,
      status,
      description,
      courseGroup: courseGroup ? ({ id: courseGroup.id } as any) : null,
      courseCategory: courseCategory ? ({ id: courseCategory.id } as any) : null,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(contractCourseId: string, body: any) {
    const id = this.reqString(contractCourseId, 'contractCourseId');
    const rec = await this.repo.findOne({ where: { contractCourseId: id } });
    if (!rec) throw new NotFoundException('Course not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== (rec as any).version) {
      throw new ConflictException('Version mismatch');
    }

    if (body.courseCode !== undefined) {
      const courseCode = this.reqString(body.courseCode, 'courseCode');
      const dup = await this.repo.findOne({ where: { courseCode } });
      if (dup && dup.contractCourseId !== rec.contractCourseId) {
        throw new ConflictException('courseCode already exists');
      }
      rec.courseCode = courseCode;
    }
    if (body.courseName !== undefined) {
      rec.courseName = this.reqString(body.courseName, 'courseName');
    }
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
      rec.status = body.status === 'ACTIVE' ? ContractCourseStatus.ACTIVE : ContractCourseStatus.INACTIVE;
    }
    if (body.description !== undefined) {
      rec.description = body.description ?? null;
    }
    if (body.contractCourseGroupId !== undefined) {
      if (body.contractCourseGroupId === null || body.contractCourseGroupId === '') {
        rec.courseGroup = null;
      } else {
        const group = await this.groupRepo.findOne({ where: { id: String(body.contractCourseGroupId) } });
        if (!group) throw new NotFoundException('CourseGroup not found');
        rec.courseGroup = group as any;
      }
    }
    if (body.contractCourseCategoryId !== undefined) {
      if (body.contractCourseCategoryId === null || body.contractCourseCategoryId === '') {
        rec.courseCategory = null;
      } else {
        const category = await this.categoryRepo.findOne({ where: { id: String(body.contractCourseCategoryId) } });
        if (!category) throw new NotFoundException('CourseCategory not found');
        rec.courseCategory = category as any;
      }
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
}
