const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Update loadUserProfile
let target_profile = `        populateDashboardPartners();
        await loadStudentVouchers(userId);
    } catch (err) {`;
let replace_profile = `        populateDashboardPartners();
        await loadStudentVouchers(userId);
        await loadStudentPromoHistory(userId);
    } catch (err) {`;
app = app.replace(target_profile, replace_profile);

// 2. Update showStudentDetailModal
let target_modal = `    // Open Modal
    const modal = document.getElementById('student-detail-modal');`;
let replace_modal = `    // Load student promo history
    await loadStudentPromoHistory(userId, true);

    // Open Modal
    const modal = document.getElementById('student-detail-modal');`;
app = app.replace(target_modal, replace_modal);

// 3. Update adminPromoForm submit
let target_promo = `            const response = await fetch(\`\${API_BASE}/admin/promos\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, points_reward, max_uses, occasion })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate promo code');
            
            showToast('Promo Generated! 🎉', \`Code \${code} is now active.\`, 'success');
            adminPromoForm.reset();
            loadAdminPromos();`;

let replace_promo = `            const response = await fetch(\`\${API_BASE}/admin/promos\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, points_reward, max_uses, occasion })
            });
            const data = await response.json();
            
            if (!response.ok) {
                if (data.promo_exists) {
                    const confirmOverride = confirm(\`This promo code (\${code}) already exists.\\nDo you want to update it to use the new reward (+\${points_reward} pts) and limit (\${max_uses || 'unlimited'})?\`);
                    if (confirmOverride) {
                        const overrideRes = await fetch(\`\${API_BASE}/admin/promos/\${code}/override\`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ points_reward, max_uses, occasion })
                        });
                        const overrideData = await overrideRes.json();
                        if (!overrideRes.ok) throw new Error(overrideData.error || 'Failed to update existing promo code');
                        showToast('Promo Updated!', \`Code \${code} has been successfully updated and re-activated.\`, 'success');
                        adminPromoForm.reset();
                        loadAdminPromos();
                        return;
                    } else {
                        return; // User cancelled
                    }
                }
                throw new Error(data.error || 'Failed to generate promo code');
            }
            
            showToast('Promo Generated! 🎉', \`Code \${code} is now active.\`, 'success');
            adminPromoForm.reset();
            loadAdminPromos();`;

let target_promo2 = `            const response = await fetch(\`\${API_BASE}/admin/promos\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, points_reward, max_uses, occasion })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate promo code');
            
            showToast('Promo Generated! YZ?', \`Code \${code} is now active.\`, 'success');
            adminPromoForm.reset();
            loadAdminPromos();`;

app = app.replace(target_promo, replace_promo).replace(target_promo2, replace_promo);

// 4. Append loadStudentPromoHistory
let append = `
async function loadStudentPromoHistory(userId, isAdminModal = false) {
    try {
        const response = await fetch(\`\${API_BASE}/users/\${userId}/promo-history\`);
        if (!response.ok) return;
        const data = await response.json();
        
        const targetList = isAdminModal ? document.getElementById('sd-promo-history-list') : document.getElementById('student-promo-history-list');
        if (!targetList) return;
        
        if (!data.history || data.history.length === 0) {
            targetList.innerHTML = '<tr><td colspan="3" style="text-align: center; color: rgba(255,255,255,0.4);">No promo codes redeemed yet.</td></tr>';
            return;
        }
        
        targetList.innerHTML = data.history.map(h => {
            const dateStr = new Date(h.claimed_at + 'Z').toLocaleDateString();
            return \`
                <tr>
                    <td><strong style="color: var(--bia-gold);">\${h.code}</strong></td>
                    <td>+\${h.points_reward}</td>
                    <td style="color: rgba(255,255,255,0.5);">\${dateStr}</td>
                </tr>
            \`;
        }).join('');
    } catch (err) {
        console.error('Error loading promo history:', err);
    }
}
`;

if (!app.includes('async function loadStudentPromoHistory')) {
    app += append;
}

fs.writeFileSync('public/app.js', app, 'utf8');
