import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CardCompanyOrg } from './card-company-org.entity';

/**
 * Card company master
 *
 * This corresponds to the "カード会社設定" (CardCompanySetting) screen
 * on the frontend. Each record represents one card company definition
 * (e.g. Visa, Master, JCB) with an effective period.
 */
@Entity('card_companies')
export class CardCompany {
  @PrimaryGeneratedColumn('uuid')
  creditId: string;

  // カード会社コード
  @Column({ type: 'varchar', length: 32 })
  creditCode: string;

  // カード会社名称
  @Column({ type: 'varchar', length: 255 })
  creditName: string;

  // Effective period (start)
  @Column({ type: 'date' })
  applyStartDate: string | Date;

  // Effective period (end). Null means "no upper bound".
  @Column({ type: 'date', nullable: true })
  applyEndDate?: string | Date | null;

  // Logical delete flag (to mirror FE "deleted" field).
  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => CardCompanyOrg, (bridge) => bridge.cardCompany)
  orgs: CardCompanyOrg[];
}

