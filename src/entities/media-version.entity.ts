import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Media } from './media.entity';

// Version of media definition per applyStartDate (and shared across orgs).
@Entity('media_versions')
@Index('ix_media_version_media_applyStartDate', ['media', 'applyStartDate'])
export class MediaVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Media, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaId' })
  media: Media;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @Column({ type: 'int' })
  dispOrder: number;

  @Column({ type: 'boolean', default: true })
  effective: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

