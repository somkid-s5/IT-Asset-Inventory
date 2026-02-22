async function test() {
    try {
        let token;
        try {
            const regRes = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test_dev_04@example.com', password: 'password123' })
            });
            const regData = await regRes.json();
            if (!regRes.ok) throw new Error("Registration failed");
            token = regData.access_token;
            console.log("Registered and Logged in!");
        } catch (e) {
            const loginRes = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test_dev_04@example.com', password: 'password123' })
            });
            const loginData = await loginRes.json();
            token = loginData.access_token;
            console.log("Logged in!");
        }

        const dashRes = await fetch('http://localhost:3001/api/dashboard/overview', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Dashboard HTTP:", dashRes.status);
        console.log("Dashboard Data:", await dashRes.text());

        const assetsRes = await fetch('http://localhost:3001/api/assets', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Assets HTTP:", assetsRes.status);
    } catch (e) {
        console.error("API Error HTTP:", e);
    }
}
test();
