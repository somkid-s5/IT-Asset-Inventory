# React Best Practices - AssetOps Project

เอกสารนี้สรุป best practices ที่ทีมควรปฏิบัติตาม เพื่อประสิทธิภาพและ maintainability ของโค้ด

---

## 📌 Priority Levels

- 🔴 **CRITICAL** - ต้องทำทันที (impact สูงมาก)
- 🟡 **HIGH** - ควรทำใน sprint นี้
- 🟢 **MEDIUM** - ทำเมื่อมีเวลา
- ⚪ **LOW** - ทำได้ถ้าสะดวก

---

## ✅ State Management

### 🔴 Lazy State Initialization
**ทำ:** อ่าน localStorage/sessionStorage แค่ครั้งเดียวตอน init

```tsx
// ✅ ถูกต้อง
const [value, setValue] = useState<string>(() => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('key') || '';
  } catch {
    return '';
  }
});

// ❌ ผิด - อ่านทุก render
const value = typeof window !== 'undefined' ? localStorage.getItem('key') : '';
```

### 🟡 Use `useSyncExternalStore` สำหรับ Global State
**ทำ:** เมื่อต้อง sync state กับ external source (localStorage, cookies)

```tsx
// ดูตัวอย่างใน AuthContext.tsx 
// แนะนำ: ใช้ useEffect ร่วมกับ /api/auth/me เพื่อยืนยัน session กับ server ทุกครั้งที่ mount
```

---

## ✅ Data Fetching

### 🔴 Eliminate Waterfalls
**ทำ:** Parallelize independent API calls

```tsx
// ✅ ถูกต้อง - Parallel
const [dashboard, user] = await Promise.all([
  api.get('/dashboard/overview'),
  api.get('/user/profile'),
]);

// ❌ ผิด - Waterfall
const dashboard = await api.get('/dashboard/overview');
const user = await api.get('/user/profile'); // รออันแรกเสร็จ!
```

### 🟡 Conditional Awaiting
**ทำ:** ตรวจสอบ condition ก่อน await

```tsx
// ✅ ถูกต้อง
if (featureFlag.enabled) {
  data = await api.get('/premium-feature');
}

// ❌ ผิด - await เสมอแม้ไม่จำเป็น
data = await (featureFlag.enabled ? api.get('/premium-feature') : null);
```

### 🟡 ใช้ Utility Functions
**ทำ:** ใช้ `parallelQueries` และ `sequentialQueries` จาก `@/lib/parallelQueries`

```tsx
import { parallelQueries } from '@/lib/parallelQueries';

const [dashboard, user, settings] = await parallelQueries(
  (q) => q.get('/dashboard/overview'),
  (q) => q.get('/user/profile'),
  (q) => q.get('/settings'),
);
```

---

## ✅ Performance Optimization

### 🟢 Optimize Loops
**ทำ:** รวม multiple iterations เป็น single pass

```tsx
// ✅ ถูกต้อง - Single pass
const processed = items.map(item => ({
  ...item,
  formatted: formatDate(item.date),
  category: getCategory(item.type),
}));

// ❌ ผิด - Multiple passes
const mapped = items.map(item => ({ ...item }));
const withDates = mapped.map(item => ({ ...item, formatted: formatDate(item.date) }));
```

### 🟢 Memoization
**ทำ:** ใช้ `useMemo` สำหรับ expensive calculations

```tsx
// ✅ ถูกต้อง
const filteredAssets = useMemo(() => {
  return assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [assets, searchTerm]);

// ❌ ผิด - คำนวณทุก render
const filteredAssets = assets.filter(asset => 
  asset.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

---

## ✅ Component Structure

### 🟡 Server vs Client Components
**ทำ:** แยกให้ชัดเจน

```tsx
// ✅ Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// ✅ Client Component (เมื่อต้องการ interactivity)
'use client';
export function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  return <button onClick={() => setState(...)}>Click</button>;
}
```

### 🟢 Bundle Management
**ทำ:** Lazy load components ใหญ่

```tsx
// ✅ ถูกต้อง - Dynamic import สำหรับ dialog ใหญ่
const AssetFormDialog = dynamic(() => 
  import('@/components/AssetFormDialog').then(mod => mod.AssetFormDialog)
);
```

---

## ✅ Error Handling

### 🔴 Graceful Degradation
**ทำ:** Handle errors อย่างสวยงาม

```tsx
// ✅ ถูกต้อง
try {
  const data = await api.get('/endpoint');
} catch (error) {
  const message = error?.response?.data?.message ?? 'Failed to load data';
  toast.error(message);
  // ไม่ crash app
}
```

### 🟡 Error Boundaries
**ทำ:** ใช้ Error Boundary ครอบ component สำคัญ

```tsx
// ดูตัวอย่างใน ErrorBoundary.tsx
```

---

## 📊 Checklist ก่อน Deploy

- [ ] ไม่มี console.log ที่เหลือจากการ debug
- [ ] ทุก API call มี error handling
- [ ] Loading states ครบ (ใช้ Skeleton)
- [ ] Empty states มี CTA ชัดเจน
- [ ] Form validation ทั้ง client และ server
- [ ] ไม่มี waterfalls ที่ไม่จำเป็น
- [ ] Bundle size ไม่เกิน 500KB (ตรวจสอบด้วย `npm run build`)

---

## 📚 References

- [Vercel React Best Practices](https://vercel.com/blog/introducing-react-best-practices)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)

---

**Last Updated:** เมษายน 2026 (Updated with Security Hardening)
**Maintained by:** IT Platform Team
