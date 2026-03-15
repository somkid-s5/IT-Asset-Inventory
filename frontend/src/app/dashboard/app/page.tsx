import { Button } from '@/components/ui/button';
import { DomainWorkspacePage } from '@/components/DomainWorkspacePage';
import { Plus } from 'lucide-react';

const rows = [
  {
    id: 'app-1',
    name: 'Inventory Portal',
    environment: 'PROD',
    url: 'https://inventory.example.local',
    stack: 'Next.js / NestJS',
    owner: 'Infra Apps',
    runtime: 'vm-prod-api-01',
    database: 'postgres-prod-main',
    status: 'Live',
  },
  {
    id: 'app-2',
    name: 'Monitoring UI',
    environment: 'TEST',
    url: 'https://monitor-test.example.local',
    stack: 'Grafana',
    owner: 'Platform Team',
    runtime: 'vm-test-web-02',
    database: 'sqlite-local',
    status: 'Testing',
  },
  {
    id: 'app-3',
    name: 'Internal Tools',
    environment: 'DEV',
    url: 'https://tools-dev.example.local',
    stack: 'Node.js',
    owner: 'DevOps',
    runtime: 'vm-dev-tools-01',
    database: 'mysql-dev-main',
    status: 'Developing',
  },
];

export default function AppPage() {
  return (
    <DomainWorkspacePage
      eyebrow="Application Workspace"
      title="Application Inventory"
      description="ใช้เก็บข้อมูลว่าเรามี application อะไรบ้าง อยู่บน prod, test หรือ dev มี URL อะไร ใช้ stack อะไร และผูกกับ VM หรือ DB ตัวไหน"
      stats={[
        { label: 'Applications', value: '3' },
        { label: 'Live URLs', value: '3' },
        { label: 'Environments', value: '3' },
      ]}
      checklistTitle="ข้อมูลที่ควรเก็บในหน้า APP"
      checklist={[
        'ชื่อ application, business purpose, owner และ environment',
        'URL หลัก, tech stack, runtime VM / container และ upstream dependencies',
        'ผูกความสัมพันธ์กับฐานข้อมูล, external API และ deployment notes',
      ]}
      columns={[
        { key: 'name', label: 'App Name' },
        { key: 'environment', label: 'Environment' },
        { key: 'url', label: 'URL' },
        { key: 'stack', label: 'Stack' },
        { key: 'owner', label: 'Owner' },
        { key: 'runtime', label: 'Runtime VM' },
        { key: 'database', label: 'Database' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      noteTitle="ทำไว้ใช้ทำอะไร"
      note="หน้า APP เอาไว้ตอบคำถามเชิงระบบว่าเรามีแอปอะไรอยู่บ้าง แต่ละตัวอยู่ environment ไหน เปิด URL ไหน และพึ่งพา VM หรือ DB ตัวไหน ช่วยงาน change impact และ handover ได้มาก"
      footerHint="หน้าชุดนี้ออกแบบให้เป็น registry ของ service/application ไม่ใช่แค่ list URL"
      actions={
        <Button className="h-9 gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          Add App
        </Button>
      }
    />
  );
}
