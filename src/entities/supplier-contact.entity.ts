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
import { Supplier } from './supplier.entity';

@Entity('supplier_contacts')
export class SupplierContact {
  @PrimaryGeneratedColumn('uuid')
  contactId: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  fax?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  position?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  department?: string | null;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
