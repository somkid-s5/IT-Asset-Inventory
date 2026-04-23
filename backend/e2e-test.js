const API_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('🚀 เริ่มต้น E2E API Boundary Testing...\n');
  let authCookie = '';

  const request = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authCookie ? { Cookie: authCookie } : {}),
        ...options.headers,
      }
    });
    
    // รับค่า Cookie ตอน Login
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
       authCookie = setCookieHeader.split(';')[0]; 
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, data };
    return data;
  };

  // 1️⃣ ทดสอบ Authentication
  console.log('1️⃣ ทดสอบ Authentication');
  try {
    await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'wrong', password: 'bad' }) });
    console.error('❌ ล้มเหลว: Login ข้อมูลผิดดันผ่านซะงั้น!');
  } catch (err) {
    console.log(`✅ สำเร็จ: ป้องกันการ Login ข้อมูลผิดได้ (ได้ ${err.status} ${err.data?.message || 'Unauthorized'})`);
  }

  try {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin1234' }) });
    console.log('✅ สำเร็จ: Login ข้อมูลถูก รับ Token ผ่าน Cookie');
  } catch (err) {
    console.error('❌ ล้มเหลว: Login ข้อมูลถูกแต่ไม่ผ่าน', err);
    return;
  }

  // 2️⃣ ทดสอบการป้องกัน Endpoint (No Token)
  console.log('\n2️⃣ ทดสอบการป้องกัน Endpoint (No Token)');
  try {
    const res = await fetch(`${API_URL}/dashboard/overview`);
    if (res.ok) console.error('❌ ล้มเหลว: Endpoint เข้าได้แม้ไม่มี Token');
    else console.log(`✅ สำเร็จ: ป้องกันการเข้าถึงไม่มี Token (ได้ ${res.status} Unauthorized)`);
  } catch (err) {
    console.error('Error', err);
  }

  // 3️⃣ ทดสอบการตรวจสอบข้อมูล (Validation) - สร้าง Asset
  console.log('\n3️⃣ ทดสอบการตรวจสอบข้อมูล (Validation) - สร้าง Asset');
  try {
    await request('/assets', { method: 'POST', body: JSON.stringify({ name: '' }) });
    console.error('❌ ล้มเหลว: สร้าง Asset แบบข้อมูลขาดหายได้');
  } catch (err) {
    console.log(`✅ สำเร็จ: ป้องกันข้อมูลไม่ครบ (ได้ ${err.status} Bad Request)`);
  }

  try {
    await request('/assets', { method: 'POST', body: JSON.stringify({ name: 'Test', type: 'INVALID_TYPE_123' }) });
    console.error('❌ ล้มเหลว: สร้าง Asset ด้วย Enum ผิดได้');
  } catch (err) {
    console.log(`✅ สำเร็จ: ป้องกันข้อมูล Enum ผิด (ได้ ${err.status} Bad Request)`);
  }

  // 4️⃣ ทดสอบ Flow สร้าง-แก้-ลบ Asset (Positive Case)
  console.log('\n4️⃣ ทดสอบ Flow สร้าง-แก้-ลบ Asset (Positive Case)');
  let createdAssetId = '';
  try {
    const data = await request('/assets', {
      method: 'POST',
      body: JSON.stringify({ name: 'TEST-SERVER-E2E', type: 'SERVER', assetId: 'AST-0001', rack: '1A' })
    });
    createdAssetId = data.id;
    console.log('✅ สำเร็จ: สร้าง Asset ใหม่ได้ (201 Created)');
  } catch (err) {
    console.error(`❌ ล้มเหลว: สร้าง Asset ไม่ได้`, err.data);
  }

  if (createdAssetId) {
    try {
      const data = await request(`/assets/${createdAssetId}`, { method: 'PATCH', body: JSON.stringify({ rack: '2B' }) });
      if (data.rack === '2B') console.log('✅ สำเร็จ: อัปเดตข้อมูล Asset ได้');
      else console.error('❌ ล้มเหลว: อัปเดตแล้วข้อมูลไม่เปลี่ยน');
    } catch (err) {
      console.error(`❌ ล้มเหลว: อัปเดต Asset ไม่ได้`, err);
    }

    try {
      await request(`/assets/${createdAssetId}`, { method: 'DELETE' });
      console.log('✅ สำเร็จ: ลบ Asset ได้');
    } catch (err) {
      console.error(`❌ ล้มเหลว: ลบ Asset ไม่ได้`, err);
    }
  }

  // 5️⃣ ทดสอบการอ้างอิงข้อมูลที่ไม่มีอยู่จริง
  console.log('\n5️⃣ ทดสอบการอ้างอิงข้อมูลที่ไม่มีอยู่จริง');
  try {
    await request('/assets/fake-uuid-1234');
    console.error('❌ ล้มเหลว: ดึงข้อมูล Asset ที่ไม่มีอยู่จริงผ่าน');
  } catch (err) {
    console.log(`✅ สำเร็จ: ส่ง ${err.status} Not Found เมื่อหาไม่พบ`);
  }

  // 6️⃣ ทดสอบ Dashboard Statistics
  console.log('\n6️⃣ ทดสอบโครงสร้าง Dashboard Overview');
  try {
    const data = await request('/dashboard/overview');
    if (data.assets && data.vm && data.databases && data.users) {
       console.log('✅ สำเร็จ: โครงสร้างข้อมูล Dashboard ครบถ้วน (Nested Objects) 100%');
    } else {
       console.error('❌ ล้มเหลว: โครงสร้าง Dashboard ผิดเพี้ยน');
    }
  } catch (err) {
    console.error(`❌ ล้มเหลว: โหลด Dashboard ไม่ได้`, err);
  }

  console.log('\n🎉 สิ้นสุดการทดสอบ E2E.');
}

runTests();
