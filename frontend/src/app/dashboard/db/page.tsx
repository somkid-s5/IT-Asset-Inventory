import { Button } from '@/components/ui/button';
import { DomainWorkspacePage } from '@/components/DomainWorkspacePage';
import { Plus } from 'lucide-react';

const rows = [
  {
    id: 'db-1',
    name: 'postgres-prod-main',
    engine: 'PostgreSQL 15',
    environment: 'PROD',
    host: 'vm-prod-api-01',
    users: 'app_user, report_user',
    roles: 'read/write, read-only',
    backup: 'Daily 01:00',
    status: 'Healthy',
  },
  {
    id: 'db-2',
    name: 'mysql-dev-main',
    engine: 'MySQL 8',
    environment: 'DEV',
    host: 'vm-dev-tools-01',
    users: 'dev_admin, ci_user',
    roles: 'admin, read/write',
    backup: 'Daily 03:00',
    status: 'Healthy',
  },
  {
    id: 'db-3',
    name: 'mssql-reporting',
    engine: 'SQL Server 2019',
    environment: 'TEST',
    host: 'vm-test-web-02',
    users: 'etl_user, report_view',
    roles: 'etl, read-only',
    backup: 'Weekly Sunday',
    status: 'Review',
  },
];

export default function DbPage() {
  return (
    <DomainWorkspacePage
      eyebrow="Database Workspace"
      title="Database Inventory"
      description="ใช้เก็บรายละเอียดของฐานข้อมูลแต่ละตัวว่าเป็น engine อะไร อยู่ environment ไหน มี user อะไรบ้าง สิทธิ์อะไร และข้อมูลการดูแลสำคัญของ database นั้น"
      stats={[
        { label: 'Databases', value: '3' },
        { label: 'DB Users', value: '6' },
        { label: 'Backup Plans', value: '3' },
      ]}
      checklistTitle="ข้อมูลที่ควรเก็บในหน้า DB"
      checklist={[
        'ชื่อฐานข้อมูล, engine/version, host, environment และ owner',
        'รายชื่อ user, role, privilege และงานที่ account นั้นใช้',
        'backup policy, replication, maintenance notes และ linked applications',
      ]}
      columns={[
        { key: 'name', label: 'DB Name' },
        { key: 'engine', label: 'Engine' },
        { key: 'environment', label: 'Environment' },
        { key: 'host', label: 'Host' },
        { key: 'users', label: 'Users' },
        { key: 'roles', label: 'Roles / Privileges' },
        { key: 'backup', label: 'Backup' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      noteTitle="ทำไว้ใช้ทำอะไร"
      note="หน้า DB ใช้เป็นจุดรวมข้อมูลฐานข้อมูลทั้งหมด โดยเฉพาะเรื่อง account และสิทธิ์ที่มักหายากเวลาตรวจสอบ production change, audit หรือ incident ว่าใครเข้าถึงอะไรได้บ้าง"
      footerHint="หน้า DB นี้ตั้งใจให้รองรับทั้ง database metadata และ user privilege inventory ในที่เดียว"
      actions={
        <Button className="h-9 gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          Add DB
        </Button>
      }
    />
  );
}
