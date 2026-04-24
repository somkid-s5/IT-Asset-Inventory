/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/services/api';

/**
 * Utility สำหรับ parallel multiple API calls
 * ช่วยป้องกัน waterfalls และลด loading time
 * 
 * @example
 * const [dashboard, user, settings] = await parallelQueries(
 *   (q) => q.get('/dashboard/overview'),
 *   (q) => q.get('/user/profile'),
 *   (q) => q.get('/settings'),
 * );
 */
export async function parallelQueries<T extends Array<(...args: any[]) => Promise<any>>>(
  ...queries: T
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  try {
    return await Promise.all(queries.map((query) => query(api))) as any;
  } catch (error) {
    // ถ้ามี query ไหนล้มเหลว จะ throw error นั้นทันที
    throw error;
  }
}

/**
 * Utility สำหรับ sequential API calls ที่ต้อง依赖กัน
 * ใช้เฉพาะเมื่อ query หลังต้องการข้อมูลจาก query ก่อนหน้า
 * 
 * @example
 * const user = await sequentialQueries(
 *   async () => api.get('/user/profile'),
 *   async (user) => api.get(`/user/${user.id}/preferences`),
 * );
 */
export async function sequentialQueries<T extends Array<(...args: any[]) => Promise<any>>>(
  ...queries: T
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results = [] as any[];
  let lastResult: any = null;

  for (const query of queries) {
    lastResult = await query(lastResult);
    results.push(lastResult);
  }

  return results as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
