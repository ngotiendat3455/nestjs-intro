import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from '../entities';

interface CreatePointBody {
  dispOrder: string | number;
  pointName: string;
  changeRate: string | number;
}

interface UpdateDeletedBody {
  deleted: boolean;
}

@Injectable()
export class PointSettingService {
  constructor(
    @InjectRepository(Point)
    private readonly repo: Repository<Point>,
  ) { }

  async list() {
    const rows = await this.repo.find({
      order: {
        dispOrder: 'ASC',
        pointName: 'ASC',
      },
    });
    return rows;
  }

  async create(body: CreatePointBody) {
    const dispOrder = this.reqInt(body.dispOrder, 'dispOrder');
    const pointName = this.reqString(body.pointName, 'pointName');
    const changeRate = this.reqNumber(body.changeRate, 'changeRate');

    if (dispOrder < 0) {
      throw new BadRequestException('dispOrder must be >= 0');
    }

    if (changeRate < 0) {
      throw new BadRequestException('changeRate must be >= 0');
    }

    const entity = this.repo.create({
      dispOrder,
      pointName,
      changeRate,
      deleted: false,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async updateDeleted(pointMstID: string, body: UpdateDeletedBody) {
    const id = this.reqString(pointMstID, 'pointMstID');
    if (typeof body.deleted !== 'boolean') {
      throw new BadRequestException('field deleted must be boolean');
    }

    const rec = await this.repo.findOne({
      where: { pointMstID: id },
    });
    if (!rec) {
      throw new NotFoundException('Point not found');
    }

    rec.deleted = body.deleted;
    const saved = await this.repo.save(rec);
    return saved;
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

  private reqNumber(v: any, field: string) {
    const n = Number(v);
    if (Number.isNaN(n)) {
      throw new BadRequestException(`field ${field} must be number`);
    }
    return n;
  }
}

