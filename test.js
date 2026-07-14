const assert = require('assert');

const API_BASE = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting BIA Auth & Admin Loyalty Engine integration tests...');

    try {
        // Test 1: Student Login
        console.log('Test 1: Student authentication...');
        const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'sarah@email.com', password: 'student123' })
        });
        assert.strictEqual(studentLoginRes.status, 200, 'Student login should return 200');
        const studentLoginData = await studentLoginRes.json();
        assert.ok(studentLoginData.success, 'Student login response should indicate success');
        assert.strictEqual(studentLoginData.user.role, 'student', 'Sarah should have student role');
        console.log('✓ Test 1 Passed: Student successfully authenticated.');

        // Test 2: Admin Login
        console.log('Test 2: Admin authentication...');
        const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin1@bradfordia.com', password: 'admin123' })
        });
        assert.strictEqual(adminLoginRes.status, 200, 'Admin login should return 200');
        const adminLoginData = await adminLoginRes.json();
        assert.ok(adminLoginData.success, 'Admin login response should indicate success');
        assert.strictEqual(adminLoginData.user.role, 'admin', 'Admin user should have admin role');
        console.log('✓ Test 2 Passed: Admin successfully authenticated.');

        // Test 3: Admin Create Student Account
        console.log('Test 3: Admin registering new student account...');
        const createPayload = {
            name: 'Fatma Al-Dhaheri',
            email: `fatma.test.${Date.now()}@email.com`,
            password: 'fatmapassword',
            student_id: `BIA-2024-${Math.floor(1000 + Math.random() * 9000)}`
        };
        const createRes = await fetch(`${API_BASE}/admin/create-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
        });
        assert.strictEqual(createRes.status, 200, 'Admin student registration should succeed');
        const createData = await createRes.json();
        assert.ok(createData.success, 'Registration response should indicate success');
        assert.ok(createData.referral_code, 'Referral code should be auto-generated');
        const newStudentId = createData.user_id;
        console.log(`✓ Test 3 Passed: Student registered successfully with ID: ${newStudentId}, Code: ${createData.referral_code}`);

        // Test 4: Admin Points Adjustment
        console.log('Test 4: Admin adjusting student points wallet balance...');
        const adjustRes = await fetch(`${API_BASE}/admin/adjust-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: newStudentId,
                points_change: 500,
                description: 'Welcome bonus credit by admin'
            })
        });
        assert.strictEqual(adjustRes.status, 200, 'Points adjustment should succeed');
        const adjustData = await adjustRes.json();
        assert.ok(adjustData.success, 'Adjustment response should indicate success');
        console.log('✓ Test 4 Passed: Points wallet balance adjusted successfully.');

        // Test 5: Fetch student profile to verify points update
        console.log('Test 5: Verify points synchronized in student profile...');
        const profileRes = await fetch(`${API_BASE}/users/${newStudentId}/profile`);
        assert.strictEqual(profileRes.status, 200, 'Profile fetch should succeed');
        const profileData = await profileRes.json();
        assert.strictEqual(profileData.user.points_balance, 500, 'Points balance should match adjustment credit');
        console.log('✓ Test 5 Passed: Profile wallet points balance successfully verified.');

        // Test 6: Retrieve Password via Student ID
        console.log('Test 6: Retrieve password via Student ID lookup...');
        const recoverRes = await fetch(`${API_BASE}/auth/retrieve-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'BIA-2024-9042' }) // Sarah's student ID
        });
        assert.strictEqual(recoverRes.status, 200, 'Recovery request should succeed');
        const recoverData = await recoverRes.json();
        assert.ok(recoverData.success, 'Recovery response should indicate success');
        assert.strictEqual(recoverData.user.password, 'student123', 'Password returned should match pre-seeded Sarah password');
        console.log('✓ Test 6 Passed: Password retrieved successfully via Student ID.');

        console.log('\n======================================================');
        console.log('🎉 All Auth & Admin integration tests passed successfully!');
        console.log('======================================================\n');
    } catch (err) {
        console.error('❌ Test failed with error:', err.message);
        process.exit(1);
    }
}

// Delay test execution briefly to ensure server has booted
setTimeout(runTests, 1000);
