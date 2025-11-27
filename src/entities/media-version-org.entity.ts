import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaVersion } from './media-version.entity';
import { Org } from './org.entity';

// Link media version to orgs it applies to.
@Entity('media_version_orgs')
export class MediaVersionOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MediaVersion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaVersionId' })
  mediaVersion: MediaVersion;

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;
}

