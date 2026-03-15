import { Button } from '@/components/ui/button';
import { DomainWorkspacePage } from '@/components/DomainWorkspacePage';
import { Plus } from 'lucide-react';

const rows = [
  {
    id: 'vm-1',
    name: 'vm-prod-api-01',
    environment: 'PROD',
    cluster: 'vSphere Cluster A',
    host: 'esx-07.dc1',
    os: 'Ubuntu 22.04',
    ip: '10.30.10.41',
    owner: 'Infra Team',
    status: 'Running',
  },
  {
    id: 'vm-2',
    name: 'vm-test-web-02',
    environment: 'TEST',
    cluster: 'vSphere Cluster B',
    host: 'esx-03.dc1',
    os: 'Windows Server 2022',
    ip: '10.30.20.18',
    owner: 'QA Team',
    status: 'Running',
  },
  {
    id: 'vm-3',
    name: 'vm-dev-tools-01',
    environment: 'DEV',
    cluster: 'Lab Cluster',
    host: 'pve-node-02',
    os: 'Rocky Linux 9',
    ip: '10.99.5.12',
    owner: 'Platform Team',
    status: 'Stopped',
  },
];

export default function VmPage() {
  return (
    <DomainWorkspacePage
      eyebrow="Compute Workspace"
      title="VM Inventory"
      description="ใช้เก็บข้อมูล VM แต่ละตัว เช่น environment, host, cluster, OS, IP, owner และสถานะ เพื่อให้รู้ว่า VM ไหนอยู่ที่ไหนและรองรับงานอะไร"
      stats={[
        { label: 'Virtual Machines', value: '3' },
        { label: 'Production', value: '1' },
        { label: 'Clusters', value: '3' },
      ]}
      checklistTitle="ข้อมูลที่ควรเก็บในหน้า VM"
      checklist={[
        'ชื่อ VM, environment, cluster, hypervisor host และ power status',
        'OS version, primary IP, application owner และทีมที่ดูแล',
        'ลิงก์กลับไปยัง asset ฝั่ง physical host หรือ storage ที่เกี่ยวข้อง',
      ]}
      columns={[
        { key: 'name', label: 'VM Name' },
        { key: 'environment', label: 'Environment' },
        { key: 'cluster', label: 'Cluster' },
        { key: 'host', label: 'Host' },
        { key: 'os', label: 'OS' },
        { key: 'ip', label: 'Primary IP' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      noteTitle="ทำไว้ใช้ทำอะไร"
      note="หน้า VM นี้เหมาะกับการตามรอยโครงสร้าง compute ของระบบ ว่า VM ไหนรันบน host ไหน อยู่ environment อะไร และเป็นของทีมไหน ช่วยทั้งงาน inventory, migration และ troubleshooting"
      footerHint="โครงนี้พร้อมต่อ backend model ของ VM โดยแยกจาก asset hardware แต่ยัง link หากันได้"
      actions={
        <Button className="h-9 gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          Add VM
        </Button>
      }
    />
  );
}
