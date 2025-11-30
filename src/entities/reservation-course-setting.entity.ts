import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';

export type ReservationCustomerType = 'NEW' | 'EXISTING';

@Entity('reservation_course_settings')
export class ReservationCourseSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // contract_courses.contractCourseId on FE: courseId
  @Column({ type: 'uuid' })
  courseId: string;

  // NEW or EXISTING customer
  @Column({ type: 'varchar', length: 16 })
  customerType: ReservationCustomerType;

  @Column({ type: 'int', default: 0 })
  displaySort: number;

  @Column({ type: 'int', default: 0 })
  treatmentTime: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  timeZone?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  classType?: string | null;

  // Optional: company & grouping info (mainly for EXISTING UI)
  @Column({ type: 'varchar', length: 64, nullable: true })
  companyCode?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contractCourseCategoryId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contractCourseGroupId?: string | null;

  @OneToMany(
    () => ReservationCourseSettingOrg,
    (o) => o.setting,
    { cascade: true },
  )
  orgLinks?: ReservationCourseSettingOrg[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

@Entity('reservation_course_setting_orgs')
export class ReservationCourseSettingOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => ReservationCourseSetting,
    (s) => s.orgLinks,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'settingId' })
  setting: ReservationCourseSetting;

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;
}

