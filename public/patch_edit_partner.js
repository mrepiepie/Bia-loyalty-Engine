
// ==========================================
// EDIT PARTNER MODAL LOGIC
// ==========================================

window.openEditPartnerModal = function(id) {
    if (!window.partnersData) return;
    const partner = window.partnersData.find(p => p.id === id);
    if (!partner) return;

    document.getElementById('edit-partner-id').value = partner.id;
    document.getElementById('edit-partner-name').value = partner.name || '';
    document.getElementById('edit-partner-title').value = partner.title || '';
    document.getElementById('edit-partner-subtitle').value = partner.subtitle || '';
    document.getElementById('edit-partner-badge').value = partner.badge || '';
    document.getElementById('edit-partner-color').value = partner.logoColor || '#EB4C42';
    document.getElementById('edit-partner-disclosure').value = partner.disclosure || '';
    document.getElementById('edit-partner-image').value = ''; // Don't prefill base64, keep it empty unless changed
    document.getElementById('edit-partner-image-file').value = ''; // clear file input

    // Render existing rewards
    const rewardsContainer = document.getElementById('edit-rewards-container');
    rewardsContainer.innerHTML = '';
    if (partner.rewards && Array.isArray(partner.rewards)) {
        partner.rewards.forEach(r => {
            addEditRewardField(r.tier || r.name, r.points || r.cost, r.value);
        });
    }

    const modal = document.getElementById('edit-partner-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
};

window.closeEditPartnerModal = function() {
    const modal = document.getElementById('edit-partner-modal');
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 300);
};

window.addEditRewardField = function(tier = '', points = '', value = '') {
    const container = document.getElementById('edit-rewards-container');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '0.5rem';
    row.style.alignItems = 'center';
    row.innerHTML = `
        <input type="text" placeholder="Tier (e.g. Silver)" value="${tier}" class="edit-reward-tier" required style="flex:1; padding:0.4rem;">
        <input type="number" placeholder="Points" value="${points}" class="edit-reward-points" required style="width:80px; padding:0.4rem;">
        <input type="text" placeholder="Value (e.g. 50 AED)" value="${value}" class="edit-reward-value" required style="flex:1; padding:0.4rem;">
        <button type="button" class="btn" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; padding:0.4rem; border:none;" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(row);
};

document.addEventListener('DOMContentLoaded', () => {
    // Image file replacement logic
    const editImageFile = document.getElementById('edit-partner-image-file');
    const editImageHidden = document.getElementById('edit-partner-image');
    if (editImageFile) {
        editImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    editImageHidden.value = ev.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                editImageHidden.value = '';
            }
        });
    }

    // Submit Edit Form logic
    const editForm = document.getElementById('admin-edit-partner-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('edit-partner-id').value;
            const submitBtn = editForm.querySelector('button[type="submit"]');
            
            // Gather rewards
            const rewardRows = document.getElementById('edit-rewards-container').children;
            const rewards = [];
            for (let row of rewardRows) {
                const t = row.querySelector('.edit-reward-tier').value.trim();
                const p = parseInt(row.querySelector('.edit-reward-points').value, 10);
                const v = row.querySelector('.edit-reward-value').value.trim();
                if (t && !isNaN(p) && v) {
                    rewards.push({ tier: t, points: p, value: v });
                }
            }

            if (rewards.length === 0 || rewards.length > 3) {
                alert('Please provide 1 to 3 rewards.');
                return;
            }

            const payload = {
                name: document.getElementById('edit-partner-name').value.trim(),
                title: document.getElementById('edit-partner-title').value.trim(),
                subtitle: document.getElementById('edit-partner-subtitle').value.trim(),
                badge: document.getElementById('edit-partner-badge').value.trim(),
                logoColor: document.getElementById('edit-partner-color').value,
                disclosure: document.getElementById('edit-partner-disclosure').value.trim(),
                image: document.getElementById('edit-partner-image').value, // Only has value if they uploaded a new one
                rewards: rewards
            };

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

                const res = await fetch(\`/api/partners/\${id}\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update partner');

                showToast('Success', 'Partner updated successfully!', 'success');
                closeEditPartnerModal();
                
                // Refresh both the admin table and the public homepage cards
                if (typeof loadAdminPartners === 'function') loadAdminPartners();
                if (typeof loadPublicPartnerships === 'function') loadPublicPartnerships();
                
            } catch (err) {
                showToast('Error', err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Save Changes';
            }
        });
    }
});
