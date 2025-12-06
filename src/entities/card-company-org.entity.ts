import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CardCompany } from './card-company.entity';
import { Org } from './org.entity';

/**
 * Bridge table between CardCompany and Org.
 *
 * One card company setting can apply to multiple orgs (stores).
 */
@Entity('card_company_orgs')
export class CardCompanyOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CardCompany, (cardCompany) => cardCompany.orgs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'creditId',
    referencedColumnName: 'creditId',
  })
  cardCompany: CardCompany;

  @ManyToOne(() => Org, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'orgId',
    referencedColumnName: 'id',
  })
  org: Org;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

