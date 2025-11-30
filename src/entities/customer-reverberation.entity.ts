import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_reverberations')
export class CustomerReverberation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'date', nullable: true })
  lastVisitDate?: string | null;

  @Column({ type: 'date', nullable: true })
  firstVisitDate?: string | null;

  @Column({ type: 'uuid', nullable: true })
  firstPersonStaffId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mediaId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  courseCategoryId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contractCourseMstId?: string | null;

  @Column({ type: 'timestamptz' })
  reverberationDate: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

