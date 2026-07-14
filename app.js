// Initial Simulator State
let state = {
    pointsBalance: 1000,
    referrals: 1,
    ledger: [
        {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AE'), // 30 days ago
            description: "First Referral Welcome Bonus (John Smith)",
            ref: "REF-BIA-9901",
            points: 1000,
            expiresAt: getExpiryDateString(4) // 4 years from 30 days ago (simplified)
        }
    ]
};

// Expiry Helper
function getExpiryDateString(yearsToAdd) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsToAdd);
    return d.toLocaleDateString('en-AE');
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Calculate Tier based on referrals
function getTier(referralCount) {
    if (referralCount >= 15) return { name: "Platinum", multiplier: 1.3, cap: 0.40, class: "platinum" };
    if (referralCount >= 5) return { name: "Gold", multiplier: 1.2, cap: 0.40, class: "gold" };
    if (referralCount >= 3) return { name: "Silver", multiplier: 1.1, cap: 0.35, class: "silver" };
    return { name: "Bronze", multiplier: 1.0, cap: 0.30, class: "bronze" };
}

// Update UI Elements
function updateUI() {
    const currentTier = getTier(state.referrals);
    
    // Update Wallet & Profile Cards
    document.getElementById('points-balance').textContent = formatNumber(state.pointsBalance);
    document.getElementById('cash-value').textContent = `AED ${formatNumber(state.pointsBalance * 0.25)}`;
    document.getElementById('referral-count').textContent = state.referrals;
    document.getElementById('tier-name').textContent = currentTier.name;
    
    // Tier Badge CSS Class update
    const tierBadge = document.getElementById('user-tier-badge');
    tierBadge.className = `tier-badge ${currentTier.class}`;
    
    // Progress calculation
    let progressPercent = 0;
    let nextTierName = "Silver";
    let nextTierRefs = 3;
    let helpText = "";

    if (state.referrals < 3) {
        progressPercent = (state.referrals / 3) * 100;
        nextTierName = "Silver";
        nextTierRefs = 3;
        const diff = 3 - state.referrals;
        helpText = `Refer ${diff} more friend${diff > 1 ? 's' : ''} to unlock Silver Tier!`;
    } else if (state.referrals < 5) {
        progressPercent = 33 + ((state.referrals - 3) / 2) * 33;
        nextTierName = "Gold";
        nextTierRefs = 5;
        const diff = 5 - state.referrals;
        helpText = `Refer ${diff} more friend${diff > 1 ? 's' : ''} to unlock Gold Tier (and get AED 250 voucher)!`;
    } else if (state.referrals < 15) {
        progressPercent = 66 + ((state.referrals - 5) / 10) * 34;
        nextTierName = "Platinum";
        nextTierRefs = 15;
        const diff = 15 - state.referrals;
        helpText = `Refer ${diff} more friend${diff > 1 ? 's' : ''} to unlock Elite Platinum Status!`;
    } else {
        progressPercent = 100;
        nextTierName = "Max Tier Achieved";
        helpText = "Congratulations! You have reached Platinum Elite Referrer status.";
    }

    document.getElementById('tier-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('next-tier-target').textContent = nextTierName === "Max Tier Achieved" ? nextTierName : `Next: ${nextTierName} (${nextTierRefs} Refs)`;
    document.getElementById('progress-help').textContent = helpText;

    // Highlight active tier card in list
    document.querySelectorAll('.tier-item').forEach(item => item.classList.remove('active'));
    if (currentTier.name === "Bronze") document.getElementById('tier-bronze-card').classList.add('active');
    if (currentTier.name === "Silver") document.getElementById('tier-silver-card').classList.add('active');
    if (currentTier.name === "Gold") document.getElementById('tier-gold-card').classList.add('active');
    if (currentTier.name === "Platinum") document.getElementById('tier-platinum-card').classList.add('active');

    // Milestones status update
    updateMilestone('milestone-5', 'm5-status', state.referrals >= 5);
    updateMilestone('milestone-10', 'm10-status', state.referrals >= 10);
    updateMilestone('milestone-15', 'm15-status', state.referrals >= 15);

    // Render Ledger
    renderLedger();
}

function updateMilestone(boxId, statusId, isUnlocked) {
    const box = document.getElementById(boxId);
    const status = document.getElementById(statusId);
    if (isUnlocked) {
        box.classList.add('unlocked');
        status.textContent = "Unlocked";
        status.className = "status-tag unlocked-tag";
    } else {
        box.classList.remove('unlocked');
        status.textContent = "Locked";
        status.className = "status-tag locked";
    }
}

// Render Ledger Table
function renderLedger() {
    const tbody = document.getElementById('ledger-body');
    tbody.innerHTML = '';
    
    // Show newest first
    const reversedLedger = [...state.ledger].reverse();
    
    reversedLedger.forEach(entry => {
        const tr = document.createElement('tr');
        const ptsClass = entry.points >= 0 ? 'ledger-pts-earn' : 'ledger-pts-spend';
        const ptsSign = entry.points >= 0 ? `+${formatNumber(entry.points)}` : formatNumber(entry.points);
        
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.description}</td>
            <td><code>${entry.ref}</code></td>
            <td class="${ptsClass}">${ptsSign}</td>
            <td>${entry.expiresAt || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Expiry logic simulation wrapper
function processEarnEvent(description, basePoints, refCode, isReferral = false) {
    const currentTier = getTier(state.referrals);
    // Apply tier point multiplier for non-referral events (like SkillShare)
    // For referrals, points are fixed (1000 for first, 250 subsequent, plus 100 program bonus)
    let pointsAwarded = basePoints;
    if (!isReferral) {
        pointsAwarded = Math.round(basePoints * currentTier.multiplier);
    }
    
    state.pointsBalance += pointsAwarded;
    
    state.ledger.push({
        date: new Date().toLocaleDateString('en-AE'),
        description: isReferral ? `${description}` : `${description} (${currentTier.name} ${currentTier.multiplier}x Multiplier)`,
        ref: refCode,
        points: pointsAwarded,
        expiresAt: getExpiryDateString(4)
    });
    
    updateUI();
}

// Generate random referral code
function generateRandomCode(prefix) {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Submit Referral Event
document.getElementById('btn-submit-referral').addEventListener('click', () => {
    const nameInput = document.getElementById('ref-name');
    const programSelect = document.getElementById('ref-program');
    const activitySelect = document.getElementById('ref-activity');
    
    // Check if logging activity instead
    if (activitySelect.value !== "") {
        const option = activitySelect.options[activitySelect.selectedIndex];
        const points = parseInt(option.getAttribute('data-points'));
        const desc = option.text.split('(')[0].trim();
        
        processEarnEvent(desc, points, generateRandomCode("ACT"));
        
        // Reset activity selector
        activitySelect.value = "";
        return;
    }

    // Otherwise process referral
    let studentName = nameInput.value.trim();
    if (!studentName) {
        const names = ["Fatima Al-Suwaidi", "Zayed Al-Nahyan", "Hamdan Al-Maktoum", "Mariam Al-Qasimi", "Rahul Sharma", "Tariq Mahmood"];
        studentName = names[Math.floor(Math.random() * names.length)];
    }
    
    const selectedOption = programSelect.options[programSelect.selectedIndex];
    const programName = selectedOption.text.split('(')[0].trim();
    const programBonus = parseInt(selectedOption.getAttribute('data-bonus'));
    
    // Increment referrals count
    state.referrals += 1;
    
    // First referral gets 1000 pts. Subsequent get 250 pts.
    let basePoints = state.referrals === 1 ? 1000 : 250;
    let desc = `Referral Enrollment: ${studentName} (${programName})`;
    
    if (programBonus > 0) {
        // Log base referral
        processEarnEvent(desc, basePoints, generateRandomCode("REF"), true);
        // Log program bonus separately
        processEarnEvent(`Premium Program Bonus: ${programName} (MBA/DBA)`, programBonus, generateRandomCode("BON"), true);
    } else {
        processEarnEvent(desc, basePoints, generateRandomCode("REF"), true);
    }
    
    // Check for milestone rewards
    if (state.referrals === 5) {
        state.pointsBalance += 0; // The milestone is a voucher, not points, but let's log it.
        state.ledger.push({
            date: new Date().toLocaleDateString('en-AE'),
            description: "🎉 Milestone Unlocked: AED 250 Voucher awarded",
            ref: generateRandomCode("VOUCH"),
            points: 0,
            expiresAt: getExpiryDateString(1) // Vouchers expire in 1 year
        });
    } else if (state.referrals === 10) {
        state.ledger.push({
            date: new Date().toLocaleDateString('en-AE'),
            description: "🎉 Milestone Unlocked: One Free Short Course (up to AED 1,000 value)",
            ref: generateRandomCode("COURSE"),
            points: 0,
            expiresAt: getExpiryDateString(1)
        });
    } else if (state.referrals === 15) {
        state.ledger.push({
            date: new Date().toLocaleDateString('en-AE'),
            description: "👑 Milestone Unlocked: Elite Platinum Status & VIP Gala Invitation",
            ref: generateRandomCode("VIP"),
            points: 0,
            expiresAt: null
        });
    }

    // Reset inputs
    nameInput.value = "";
    updateUI();
});

// Calculate Redemption Discount
let currentCalculation = null;

document.getElementById('btn-calculate-discount').addEventListener('click', () => {
    const courseFeeInput = document.getElementById('course-fee');
    const pointsRedeemInput = document.getElementById('points-to-redeem');
    
    const courseFee = parseFloat(courseFeeInput.value);
    let pointsToRedeem = parseInt(pointsRedeemInput.value);
    
    if (isNaN(courseFee) || courseFee <= 0) {
        alert("Please enter a valid course fee.");
        return;
    }
    if (isNaN(pointsToRedeem) || pointsToRedeem < 0) {
        alert("Please enter a valid amount of points.");
        return;
    }
    
    const currentTier = getTier(state.referrals);
    const maxDiscountAED = courseFee * currentTier.cap;
    const maxPointsRedeemable = (maxDiscountAED / 0.25);
    
    // Clamp points to redeem to what the user actually has
    let pointsApplied = Math.min(pointsToRedeem, state.pointsBalance);
    
    // Clamp points to redeem to the maximum cap allowed
    if (pointsApplied > maxPointsRedeemable) {
        pointsApplied = maxPointsRedeemable;
    }
    
    // Make sure points applied is rounded to integer
    pointsApplied = Math.floor(pointsApplied);
    
    const discountAED = pointsApplied * 0.25;
    const finalFee = courseFee - discountAED;
    
    // Save calculation state
    currentCalculation = {
        pointsUsed: pointsApplied,
        discount: discountAED,
        finalFee: finalFee
    };
    
    // Show results UI
    document.getElementById('cap-percent-label').textContent = `${currentTier.cap * 100}%`;
    document.getElementById('max-discount-val').textContent = `AED ${formatNumber(maxDiscountAED)}`;
    document.getElementById('points-applied-val').textContent = `${formatNumber(pointsApplied)} pts`;
    document.getElementById('net-discount-val').textContent = `AED ${formatNumber(discountAED)}`;
    document.getElementById('final-payable-val').textContent = `AED ${formatNumber(finalFee)}`;
    
    document.getElementById('redemption-results').style.display = 'block';
});

// Confirm and Deduct Points
document.getElementById('btn-confirm-redemption').addEventListener('click', () => {
    if (!currentCalculation) return;
    
    if (currentCalculation.pointsUsed > state.pointsBalance) {
        alert("Insufficient points balance.");
        return;
    }
    
    state.pointsBalance -= currentCalculation.pointsUsed;
    
    state.ledger.push({
        date: new Date().toLocaleDateString('en-AE'),
        description: `Redemption: Course Fee Discount (AED ${formatNumber(currentCalculation.discount)})`,
        ref: generateRandomCode("RED"),
        points: -currentCalculation.pointsUsed,
        expiresAt: null
    });
    
    // Reset Calculation UI
    document.getElementById('redemption-results').style.display = 'none';
    currentCalculation = null;
    
    updateUI();
});

// Clear and Reset Simulation
document.getElementById('btn-clear-ledger').addEventListener('click', () => {
    state.pointsBalance = 0;
    state.referrals = 0;
    state.ledger = [];
    document.getElementById('redemption-results').style.display = 'none';
    updateUI();
});

// Initialize UI on Page Load
updateUI();
