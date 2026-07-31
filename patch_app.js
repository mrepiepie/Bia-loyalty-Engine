const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

const anchorStart = 'async function loadAdminVoucherReport() {';
const anchorEnd = 'window.loadAdminVoucherReport = loadAdminVoucherReport;';

const startIndex = content.indexOf(anchorStart);
const endIndex = content.indexOf(anchorEnd) + anchorEnd.length;

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    console.error("Could not find the function to replace.");
    process.exit(1);
}

const replacement = `window.cachedAdminVouchers = [];

async function loadAdminVoucherReport() {
    const tbody = document.getElementById('admin-vouchers-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        const res = await fetch(\`\${API_BASE}/admin/vouchers\`);
        if (!res.ok) throw new Error('Failed to load voucher data.');
        const vouchers = await res.json();
        window.cachedAdminVouchers = vouchers;

        const totalEl = document.getElementById('voucher-stat-total');
        const valueEl = document.getElementById('voucher-stat-value');
        const avgEl   = document.getElementById('voucher-stat-avg');

        const totalValue = vouchers.reduce((sum, v) => sum + (v.discount_aed || 0), 0);
        const avgValue = vouchers.length ? (totalValue / vouchers.length).toFixed(1) : 0;
        
        if (totalEl) totalEl.textContent = vouchers.length;
        if (valueEl) valueEl.textContent = \`\${totalValue.toFixed(0)} AED\`;
        if (avgEl) avgEl.textContent = \`\${avgValue} AED\`;

        filterAdminVouchers();
    } catch (err) {
        if (tbody) tbody.innerHTML = \`<tr><td colspan="8" class="no-data" style="color:#ef4444;">Error: \${err.message}</td></tr>\`;
    }
}
window.loadAdminVoucherReport = loadAdminVoucherReport;

function filterAdminVouchers() {
    const tbody = document.getElementById('admin-vouchers-body');
    if (!tbody) return;
    
    const searchInput = document.getElementById('admin-voucher-search');
    const filterInput = document.getElementById('admin-voucher-status-filter');
    
    const searchStr = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = filterInput ? filterInput.value : 'ALL';
    
    const filtered = window.cachedAdminVouchers.filter(v => {
        const code = (v.voucher_code || '').toLowerCase();
        const sName = (v.student_name || '').toLowerCase();
        const matchesSearch = code.includes(searchStr) || sName.includes(searchStr);
        
        const status = v.status ? v.status.toUpperCase() : 'UNUSED';
        const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No vouchers found matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(v => \`
        <tr>
            <td style="font-family:'Outfit'; font-size:0.8rem; color:#dfb15b; font-weight:700;">\${v.voucher_code || '—'}</td>
            <td><strong class="clickable-student-name" onclick="showStudentDetailModal(\${v.user_id})" style="color: var(--text-main); cursor: pointer; text-decoration: underline;">\${v.student_name || 'Unknown'}</strong></td>
            <td style="color:#4ade80; font-weight:700;">\${v.discount_aed || 0} AED</td>
            <td style="font-family:'Outfit';">\${formatNumber(v.points_deducted || 0)} pts</td>
            <td><span style="font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:4px; background:\${v.status === 'Used' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid \${v.status === 'Used' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}; color:\${v.status === 'Used' ? '#4ade80' : 'rgba(255,255,255,0.5)'}; font-weight:700;">\${v.status || 'Unused'}</span></td>
            <td style="font-size:0.72rem; color:rgba(255,255,255,0.5);">\${v.created_at ? cleanDate(v.created_at) : '—'}</td>
            <td>
                \${v.status !== 'Used' ? \`<button onclick="adminUseVoucher('\${v.voucher_code}')" style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); color:#4ade80; padding:0.25rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.7rem; font-weight:bold; transition:all 0.2s;" onmouseover="this.style.background='rgba(74,222,128,0.2)'" onmouseout="this.style.background='rgba(74,222,128,0.1)'" title="Mark as Used"><i class="fa-solid fa-check"></i> Mark Used</button>\` : \`<span style="font-size:0.7rem; color:rgba(255,255,255,0.3);"><i class="fa-solid fa-check-double"></i> Claimed</span>\`}
            </td>
            <td>
                <button onclick="adminDeleteVoucher(\${v.voucher_id})" style="background:none; border:none; color:rgba(239,68,68,0.4); cursor:pointer; font-size:0.8rem; transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(239,68,68,0.4)'" title="Delete voucher">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>\`).join('');
}
window.filterAdminVouchers = filterAdminVouchers;

async function adminUseVoucher(code) {
    if (!confirm(\`Mark voucher \${code} as Used? This cannot be undone easily.\`)) return;
    try {
        const res = await fetch(\`\${API_BASE}/admin/vouchers/use\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voucher_code: code })
        });
        if (!res.ok) throw new Error();
        showToast('Voucher Used', \`Voucher \${code} marked as used.\`, 'success');
        loadAdminVoucherReport();
    } catch { showToast('Error', 'Could not update voucher.', 'error'); }
}
window.adminUseVoucher = adminUseVoucher;`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync('public/app.js', newContent);
console.log("Successfully replaced loadAdminVoucherReport in app.js.");
