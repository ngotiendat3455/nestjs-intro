import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Media, MediaVersion, MediaVersionOrg, Org } from '../entities';

type MediaSearchType = 'ALL' | 'VALID' | 'INVALID';

interface ListQuery {
  orgIds: string;
  isAppluUnderOrg: boolean;
  targetDate: string; // YYYY-MM-DD
  keyWord: string;
  mediaSearchType: MediaSearchType;
}

interface DetailQuery {
  mediaId: string;
  targetDate: string; // YYYY-MM-DD
  mediaSearchType: 'VALID' | 'INVALID';
}

interface UpsertQuery {
  applyDate: string; // previous applyStartDate (when editing) or same as applyStartDate when creating
  applyStartDate: string; // new applyStartDate from form
  mediaId: string; // empty when creating
  mediaSearchType: 'VALID' | 'INVALID';
  invalidChangeFlag: 0 | 1 | 2;
}

@Injectable()
export class MediaMasterService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(MediaVersion)
    private readonly versionRepo: Repository<MediaVersion>,
    @InjectRepository(MediaVersionOrg)
    private readonly versionOrgRepo: Repository<MediaVersionOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) {}

  async list(query: ListQuery) {
    const targetDate = this.reqDate(query.targetDate, 'targetDate');

    const qb = this.versionRepo
      .createQueryBuilder('mv')
      .innerJoinAndSelect('mv.media', 'm')
      .leftJoinAndSelect('media_version_orgs', 'mvo', 'mvo.mediaVersionId = mv.id')
      .leftJoinAndSelect('orgs', 'o', 'o.id = mvo.orgId')
      .where('mv.applyStartDate = :d', { d: targetDate });

    if (query.mediaSearchType === 'VALID') {
      qb.andWhere('mv.effective = :eff', { eff: true });
    } else if (query.mediaSearchType === 'INVALID') {
      qb.andWhere('mv.effective = :eff', { eff: false });
    }

    if (query.keyWord) {
      qb.andWhere(
        '(m.mediaCode ILIKE :s OR m.mediaName ILIKE :s)',
        { s: `%${query.keyWord}%` },
      );
    }

    if (query.orgIds) {
      // Single org id string; FE will further filter by hierarchy
      qb.andWhere('o.id = :orgId', { orgId: query.orgIds });
    }

    qb.orderBy('mv.dispOrder', 'ASC');

    const rows = await qb.getRawMany();

    // Aggregate into FE shape: IMediaListData
    const byVersion: Record<string, any> = {};
    for (const r of rows) {
      const mvId = r.mv_id as string;
      if (!byVersion[mvId]) {
        byVersion[mvId] = {
          mediaId: r.m_mediaId,
          mediaCode: r.m_mediaCode,
          mediaName: r.m_mediaName,
          mediaCategory: r.m_mediaCategory,
          dispOrder: r.mv_dispOrder,
          effective: r.mv_effective,
          applyStartDate: r.mv_applyStartDate,
          listOrg: [] as any[],
        };
      }
      if (r.o_id) {
        byVersion[mvId].listOrg.push({
          id: { orgId: r.o_id },
          orgName: r.o_orgName,
        });
      }
    }

    return Object.values(byVersion);
  }

  async getDetail(query: DetailQuery) {
    const mediaId = this.reqString(query.mediaId, 'mediaId');
    const targetDate = this.reqDate(query.targetDate, 'targetDate');

    const media = await this.mediaRepo.findOne({ where: { mediaId } });
    if (!media) throw new NotFoundException('Media not found');

    const version = await this.versionRepo.findOne({
      where: { media: { mediaId } as any, applyStartDate: targetDate as any },
    });
    if (!version) throw new NotFoundException('Media version not found');

    const versionOrgs = await this.versionOrgRepo.find({
      where: { mediaVersion: { id: version.id } as any },
      relations: ['org'],
    });

    return {
      mediaId: media.mediaId,
      mediaCode: media.mediaCode,
      mediaName: media.mediaName,
      mediaCategory: media.mediaCategory,
      dispOrder: version.dispOrder,
      effective: version.effective,
      applyStartDate: version.applyStartDate,
      listOrg: versionOrgs.map((vo) => ({
        id: { orgId: vo.org.id },
        orgName: vo.org.orgName,
      })),
    };
  }

  async upsert(query: UpsertQuery, body: any) {
    const applyStartDate = this.reqDate(query.applyStartDate, 'applyStartDate');
    const orgIds: string[] = Array.isArray(body.orgIds)
      ? body.orgIds
      : Array.isArray(body.listOrgId)
      ? body.listOrgId
      : body.orgIds
      ? String(body.orgIds).split(',')
      : [];

    if (!orgIds.length) {
      throw new BadRequestException('orgIds is required');
    }

    const dispOrder = this.reqInt(body.dispOrder, 'dispOrder');
    const mediaCategory = this.reqInt(body.mediaCategory, 'mediaCategory');
    const mediaCode = this.reqString(body.mediaCode, 'mediaCode');
    const mediaName = this.reqString(body.mediaName, 'mediaName');
    const effective = typeof body.effective === 'boolean'
      ? body.effective
      : body.effective === 'true';

    let media: Media | null = null;
    if (query.mediaId) {
      media = await this.mediaRepo.findOne({ where: { mediaId: query.mediaId } });
      if (!media) throw new NotFoundException('Media not found');
      media.mediaCode = mediaCode;
      media.mediaName = mediaName;
      media.mediaCategory = mediaCategory;
    } else {
      media = this.mediaRepo.create({ mediaCode, mediaName, mediaCategory });
    }

    const savedMedia = await this.mediaRepo.save(media);

    // Simple rule: one version per media + applyStartDate; upsert on that
    let version = await this.versionRepo.findOne({
      where: {
        media: { mediaId: savedMedia.mediaId } as any,
        applyStartDate: applyStartDate as any,
      },
    });

    if (!version) {
      version = this.versionRepo.create({
        media: { mediaId: savedMedia.mediaId } as any,
        applyStartDate: applyStartDate as any,
        dispOrder,
        effective,
      });
    } else {
      version.dispOrder = dispOrder;
      version.effective = effective;
    }

    const savedVersion = await this.versionRepo.save(version);

    // Update org links: replace all for this version
    await this.versionOrgRepo.delete({ mediaVersion: { id: savedVersion.id } as any });

    const orgs = await this.orgRepo.find({ where: { id: In(orgIds) } });
    if (!orgs.length) throw new BadRequestException('orgIds not found');

    const links = orgs.map((o) =>
      this.versionOrgRepo.create({
        mediaVersion: { id: savedVersion.id } as any,
        org: { id: o.id } as any,
      }),
    );
    await this.versionOrgRepo.save(links);

    return this.getDetail({
      mediaId: savedMedia.mediaId,
      targetDate: applyStartDate,
      mediaSearchType: query.mediaSearchType,
    });
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    }
    return v;
  }

  private reqInt(v: any, field: string) {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      throw new BadRequestException(`field ${field} must be integer`);
    }
    return n;
  }
}

