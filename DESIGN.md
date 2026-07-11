# DESIGN.md - IT Asset Inventory (Internal Admin Tool)

## Layout Skeleton (อ้างจาก AppLayout.tsx / AppSidebar.tsx ที่มีอยู่แล้ว)
- Shell: AppSidebar (fixed ซ้าย) + Topbar (AppBreadcrumbs + UserAvatar) + Content area (component เหล่านี้มีอยู่แล้ว ห้ามสร้าง layout shell ใหม่)
- List page pattern (ตาม assets/page.tsx, users/page.tsx, databases/page.tsx): Page Title (ผ่าน usePageHeader) -> Search/Filter bar -> Table (@tanstack/react-table + shadcn Table) -> Pagination
- Form pattern: ใช้ Dialog + react-hook-form ผ่าน AssetFormDialog/DatabaseFormDialog/VmFormDialog เป็นต้นแบบ (ไม่ใช่ full-page form) และหน้า User management จะใช้ Dialog pattern เสมอโดยไม่มีหน้า [id] detail เพื่อความกระชับ
- Loading state: ทุกหน้าต้องมี loading.tsx ของ Next.js เอง (มีอยู่แล้วใน assets/, databases/, users/, virtual-machines/, audit-logs/) - หน้าใหม่ต้องมีไฟล์นี้เสมอ
- Empty state: ใช้ <EmptyState /> component ที่มีอยู่แล้ว ห้าม inline ข้อความเปล่าเอง

## Design Tokens (จาก globals.css @theme - ใช้ตัวแปรเหล่านี้เท่านั้น)
- สี status/severity: --color-critical, --color-high, --color-medium, --color-low, --color-success, --color-warning, --color-info
  -> ห้ามใช้ amber-500 / blue-500 / emerald-500 ตรงๆ ต้อง map เข้า token กลุ่มนี้เสมอ
- สี UI ทั่วไป: --color-primary, --color-secondary, --color-destructive, --color-muted, --color-accent, --color-border
- Radius: --radius-lg (card), --radius-md (input/button), --radius-sm (badge/chip)
- Font: --font-sans (Google Sans, ใช้กับ body/UI ทั่วไป), --font-mono (ใช้กับ data/code/serial number - "Cyber Terminal" theme ของโปรเจกต์)
- Animation: มี --animate-slide-in และ keyframe toast-* กำหนดไว้แล้ว ห้ามสร้าง keyframe ใหม่ซ้ำซ้อน ให้ reuse ของเดิม

## Component ที่มีอยู่แล้ว (ต้อง reuse ก่อนสร้างใหม่เสมอ)
- จาก /components/ui: Alert, Badge, Button, Card, Chart, Checkbox, Command, Dialog, DropdownMenu, Form, Input, Label, Popover, Select, Skeleton, Sonner(toast), Table, Tabs, Textarea
- จาก /components: AppLayout, AppSidebar, AppBreadcrumbs, EmptyState, Skeletons (DashboardSkeleton, DataTableSkeleton), UserAvatar, NavLink

## กฎตายตัว
1. ทุกหน้า list ใหม่ต้องใช้ @tanstack/react-table + shadcn Table เหมือนหน้าที่มีอยู่ ห้ามเขียน table ด้วยมือใหม่
2. ถ้าจะใช้ framer-motion containerVariants/itemVariants ให้ import จากไฟล์กลาง /lib/animations.ts ทุกหน้า import จากที่นั่น ห้าม copy ก้อนเดิมซ้ำ
3. ตั้งชื่อ component/skeleton/hook ตามหน้าที่ใช้งานจริง ห้ามตั้งชื่อเฉพาะแล้วส่งต่อ ไปเรียกของหน้าอื่น (alias หลอก) ถ้าจะ reuse ของเดิมจริงๆ ให้ import ชื่อเดิมตรงๆ ไม่ต้องสร้างชื่อใหม่มาห่อ
4. ทุก field ที่เป็นข้อมูล sensitive (credential, IP, serial) ต้องมี masking/permission check - ผูกกับ incident credential exposure ที่เคยเจอ ห้ามเกิดซ้ำ
5. Responsive breakpoint และ container width ให้ยึดตามที่ AppLayout.tsx กำหนดไว้แล้ว ห้ามคิด breakpoint ใหม่ต่อหน้า
