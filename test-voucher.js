const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/loyalty.db');

async function testVoucher() {
    console.log("Adding 50,000 points to user 2...");
    
    // Give user 2 lots of points
    db.run(`UPDATE users SET points_balance = 50000 WHERE user_id = 2`, function(err) {
        if(err) { console.error(err); return; }
        console.log("Points updated.");
        
        db.run(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining) VALUES (2, 50000, 'Adjustment', 'Test Grant', 50000)`, async function(err) {
            if(err) { console.error(err); return; }
            console.log("Ledger updated. Firing redeem-tuition request...");
            
            try {
                const res = await fetch('http://localhost:3001/api/redeem/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: 2,
                        points_deducted: 5000,
                        discount_aed: 500,
                        course_fee: 10000
                    })
                });
                
                const data = await res.json();
                console.log("Redeem Response:", data);
            } catch (err) {
                console.error("Fetch Error:", err);
            }
        });
    });
}

testVoucher();
