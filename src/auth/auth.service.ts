import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { createHmac, scryptSync } from 'crypto';

interface LoginResult {
  companyCode: string;
  staffId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly accessTtlSec = 3600; // 1 hour
  private readonly refreshTtlSec = 60 * 60 * 24 * 30; // 30 days
  private readonly secret = process.env.JWT_SECRET || 'dev-secret';

  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {}

  async login(companyCode: string, loginCode: string, password: string): Promise<LoginResult> {
    if (!loginCode || !password) throw new BadRequestException('loginCode and password are required');
    const today = new Date();
    const y = today.getUTCFullYear();
    const m = String(today.getUTCMonth() + 1).padStart(2, '0');
    const d = String(today.getUTCDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const qb = this.staffRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.org', 'o')
      .leftJoinAndSelect('s.masterRole', 'masterRole')
      .leftJoinAndSelect('s.customerRole', 'customerRole')
      .leftJoinAndSelect('s.reservationRole', 'reservationRole')
      .leftJoinAndSelect('s.commonRole', 'commonRole')
      .leftJoinAndSelect('s.registerRole', 'registerRole')
      .leftJoinAndSelect('s.contractRole', 'contractRole')
      .leftJoinAndSelect('s.revenueRole', 'revenueRole')
      .leftJoinAndSelect('s.inventoryRole', 'inventoryRole')
      .leftJoinAndSelect('s.magazineRole', 'magazineRole')
      .where('s.companyCode = :companyCode', { companyCode })
      .andWhere('s.loginId = :loginId', { loginId: loginCode })
      .andWhere('s.isActive = true')
      .andWhere('s.applyStartDate <= :today AND (s.applyEndDate IS NULL OR :today < s.applyEndDate)', { today: todayStr })
      .orderBy('s.applyStartDate', 'DESC')
      .limit(1);

    const staff = await qb.getOne();
    if (!staff || !staff.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (!this.verifyPassword(staff.passwordHash, password)) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.signToken({ sub: staff.staffId, companyCode }, this.accessTtlSec);
    const refreshToken = this.signToken({ sub: staff.staffId, companyCode, type: 'refresh' }, this.refreshTtlSec);
    return {
      companyCode,
      staffId: staff.staffId,
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSec,
    };
  }

  verifyToken(token: string): any {
    try {
      const [h, p, s] = token.split('.');
      if (!h || !p || !s) throw new Error('Malformed token');
      const expected = createHmac('sha256', this.secret).update(`${h}.${p}`).digest('base64url');
      if (expected !== s) throw new Error('Invalid signature');
      const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
      if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) throw new Error('Token expired');
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private signToken(payload: any, ttlSec: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + ttlSec };
    const h = Buffer.from(JSON.stringify(header)).toString('base64url');
    const p = Buffer.from(JSON.stringify(body)).toString('base64url');
    const s = createHmac('sha256', this.secret).update(`${h}.${p}`).digest('base64url');
    return `${h}.${p}.${s}`;
  }

  private verifyPassword(stored: string, plain: string): boolean {
    // Format: scrypt$<salt>$<hash>
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const hash = parts[2];
    const calc = scryptSync(plain, salt, 64).toString('hex');
    return hash === calc;
  }
}

