const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Initialize A4 PDF Document with margins
const doc = new PDFDocument({
    size: 'A4',
    margins: {
        top: 45,
        bottom: 55,
        left: 45,
        right: 45
    },
    bufferPages: true
});

// Stream PDF to file
const destPath = path.join(__dirname, 'BIA_Loyalty_Engine_Proposal.pdf');
const stream = fs.createWriteStream(destPath);
doc.pipe(stream);

// Corporate Minimalist Theme Colors
const colorPrimary = '#0f172a'; // Slate 900
const colorSecondary = '#2563eb'; // Indigo Blue
const colorAccent = '#0d9488'; // Teal Green
const colorTextDark = '#1e293b'; // Slate 800
const colorTextMuted = '#64748b'; // Slate 500
const colorBgLight = '#f8fafc'; // Slate 50
const colorBorder = '#e2e8f0'; // Slate 200

// Helper function to draw page header & footer borders
function drawPageShell(pageNum, totalPages) {
    // Header line
    doc.strokeColor(colorBorder)
       .lineWidth(0.8)
       .moveTo(45, 30)
       .lineTo(550, 30)
       .stroke();

    // Footer line
    doc.strokeColor(colorBorder)
       .lineWidth(0.8)
       .moveTo(45, 790)
       .lineTo(550, 790)
       .stroke();

    // Page Number (Bottom Right)
    doc.fillColor(colorTextMuted)
       .font('Helvetica')
       .fontSize(8)
       .text(`BIA Enterprise Loyalty Engine Proposal | Page ${pageNum} of ${totalPages}`, 45, 800, { align: 'right' });
}

// Custom Section Header
function drawSectionTitle(title) {
    doc.fillColor(colorPrimary)
       .font('Helvetica-Bold')
       .fontSize(13)
       .text(title)
       .moveDown(0.4);
    
    doc.strokeColor(colorSecondary)
       .lineWidth(1.2)
       .moveTo(45, doc.y)
       .lineTo(550, doc.y)
       .stroke()
       .moveDown(0.8);
}

// ============================================================================
// PAGE 1: COVER PAGE & TABLE OF CONTENTS
// ============================================================================
doc.rect(45, 45, 505, 180).fill(colorPrimary);
doc.fillColor('#ffffff')
   .font('Helvetica-Bold')
   .fontSize(22)
   .text('ENTERPRISE LOYALTY ENGINE', 70, 75)
   .fontSize(22)
   .text('SPECIFICATION PROPOSAL', 70, 100)
   .fontSize(11)
   .font('Helvetica')
   .text('A Multi-Brand Referral, Tier-Progression, & Gamification Ecosystem', 70, 135)
   .fontSize(9)
   .fillColor('#cbd5e1')
   .text('CLIENT: BRADFORD INTERNATIONAL ALLIANCE (SHARJAH OFFICE)', 70, 175)
   .text('DOCUMENT VERSION: 2.1 (PITCH & ARCHITECTURE READY)', 70, 190);

doc.y = 260;
drawSectionTitle('TABLE OF CONTENTS');

const tocItems = [
    { page: 2, title: '1. Executive Summary & Sharjah BIA Business Context' },
    { page: 3, title: '2. Relational Database Schema & Architecture Blueprint' },
    { page: 4, title: '3. API Endpoint Specifications & Ledger Webhooks' },
    { page: 5, title: '4. Shukran-Style Tier Management & Multipliers' },
    { page: 6, title: '5. Points Expiration Algorithms & Expiry Mathematics' },
    { page: 7, title: '6. WhatsApp Business API & LMS Integrations' },
    { page: 8, title: '7. Security Protocols, Anti-Fraud Middleware, & Compliance' },
    { page: 9, title: '8. Implementation Timelines (Intern + AI) & QA Test Suites' }
];

doc.fillColor(colorTextDark).font('Helvetica').fontSize(10).lineGap(4);
tocItems.forEach(item => {
    const dots = '.'.repeat(80 - item.title.length);
    doc.text(`${item.title} ${dots} Page ${item.page}`);
});

doc.moveDown(3);
doc.fillColor(colorTextMuted)
   .font('Helvetica-Oblique')
   .fontSize(8.5)
   .text('Confidential Document. For internal BIA planning and review only. Unauthorized distribution is prohibited.', { align: 'center' });

// ============================================================================
// PAGE 2: EXECUTIVE SUMMARY & BUSINESS CONTEXT
// ============================================================================
doc.addPage();
drawSectionTitle('1. EXECUTIVE SUMMARY & SHARJAH BIA BUSINESS CONTEXT');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(4)
   .text('Bradford International Alliance (BIA), operating in Al Nahda, Sharjah, represents a premier academic consultancy. It facilitates undergraduate, postgraduate (MBA, DBA), and Doctorate pathways for corporate professionals in the UAE. Executive academic courses carry tuition fees ranging from AED 10,000 to over AED 50,000. Due to these high transaction values and the relationship-driven nature of academic registration, word-of-mouth represents BIA\'s most valuable marketing channel.', { align: 'justify' })
   .moveDown(0.8)
   .text('A standard student referral program is simple. However, to create a system that drives high retention and long-term brand loyalty (similar to Landmark Group\'s Shukran program), BIA needs an integrated Multi-Brand Loyalty Engine. This engine connects BIA\'s primary education offerings with its subsidiaries: BIA Academics, Bradford Learning Global (professional certifications like ACCA and CMA), and BIA EduAbroad.', { align: 'justify' })
   .moveDown(0.8)
   .text('This specification proposal details a modular, highly scalable system designed for BIA\'s specific tech capabilities. It outlines a strategy where an intern, guided by Antigravity AI, can deploy a transactional custom API in 12 days. Alternatively, it presents a 5-day headless SaaS option to quickly validate client acquisition rates.', { align: 'justify' })
   .moveDown(1.2)
   .font('Helvetica-Bold').fontSize(10.5).text('Core Program Values (As per PDF Proposal):')
   .font('Helvetica').fontSize(9.5).moveDown(0.3)
   .text('• Point Equivalency: 100 points = AED 25 credit (1 point = AED 0.25).')
   .text('• First-Referral Bonus: Credits 1,000 points (AED 250 value) to the referrer.')
   .text('• Subsequent Referrals: Credits 250 points (AED 62.50 value) to the referrer.')
   .text('• New Student Welcome: Credits 200 points (AED 50 value) to the referee.')
   .text('• Program Bonus: Additional 100 points (AED 25 value) if the referee joins an MBA, DBA, or Doctorate.');

// ============================================================================
// PAGE 3: DATABASE SCHEMA & ARCHITECTURE BLUEPRINT
// ============================================================================
doc.addPage();
drawSectionTitle('2. RELATIONAL DATABASE SCHEMA & ARCHITECTURE BLUEPRINT');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('Because loyalty points are a form of financial ledger credit, the database must be relational (SQL) to support transactions (ACID compliance). The schema below specifies the tables, fields, and indexing strategies optimized for MySQL:')
   .moveDown(0.8);

// Users Table Schema
doc.font('Helvetica-Bold').fontSize(10).text('Table 1: users (Tracks balances & tiers)')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• user_id (INT, PK, Auto Increment) - Unique studentidentifier.')
   .text('• name / email / referral_code (VARCHAR) - Unique fields with indexes.')
   .text('• current_tier (ENUM: Bronze, Silver, Gold, Platinum) - Defaults to Bronze.')
   .text('• points_balance / total_earned (INT) - Tracks current wallet balance.')
   .moveDown(0.6);

// Referrals Table Schema
doc.font('Helvetica-Bold').fontSize(10).text('Table 2: referrals (Tracks enrollment workflows)')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• referral_id (INT, PK) - Unique referral tracking ID.')
   .text('• referrer_id (INT, FK) - Link back to users table.')
   .text('• referee_email / program_name (VARCHAR) - Tracking attributes.')
   .text('• status (ENUM: Lead, Enrolled, FirstPaymentCompleted, Cancelled).')
   .text('• payment_date (TIMESTAMP, Nullable) - Triggers the points release.')
   .moveDown(0.6);

// Ledger Table Schema
doc.font('Helvetica-Bold').fontSize(10).text('Table 3: points_ledger (Double-entry transaction audit log)')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• ledger_id (INT, PK) - Ledger tracking index.')
   .text('• user_id (INT, FK) - Link to users.')
   .text('• points_change (INT) - Signed integer (+250, -500).')
   .text('• event_type (ENUM: Referral, ProgramBonus, Welcome, SkillShare, Expiry, Redemption).')
   .text('• expires_at (TIMESTAMP) - Automatically set to Transaction Date + 4 Years.')
   .text('• points_remaining (INT) - Tracks unredeemed portion of this specific deposit.')
   .moveDown(0.8)
   .font('Helvetica-Bold').fontSize(10).text('Indexing Strategy for Performance:')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• INDEX(users.referral_code): Accelerates referral link lookups during signup.')
   .text('• INDEX(points_ledger.expires_at, points_ledger.points_remaining): Optimizes nightly cron checks.');

// ============================================================================
// PAGE 4: API ENDPOINT SPECIFICATIONS
// ============================================================================
doc.addPage();
drawSectionTitle('3. API ENDPOINT SPECIFICATIONS & LEDGER WEBHOOKS');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('The BIA Loyalty subdomain will expose RESTful API endpoints for backend triggers (LMS, payment portal) and student frontend wallets. All requests must utilize Bearer token authorization:')
   .moveDown(0.8);

// Endpoint 1
doc.font('Helvetica-Bold').fontSize(10.5).text('1. POST /api/v1/loyalty/referral-lead')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• Purpose: Records a new referral submission when a student enters a referral code.')
   .text('• Request Payload:')
   .font('Courier').text('  { "referrer_code": "SARAH-9042", "referee_email": "john@email.com", "program": "MBA" }')
   .font('Helvetica').text('• Response (201 Created):')
   .font('Courier').text('  { "success": true, "message": "Referral registered successfully", "referral_id": 404 }')
   .moveDown(0.8);

// Endpoint 2
doc.font('Helvetica-Bold').fontSize(10.5).text('2. POST /api/v1/loyalty/payment-verified')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• Purpose: Triggers points release once the finance portal verifies the first payment.')
   .text('• Request Payload:')
   .font('Courier').text('  { "referral_id": 404, "invoice_number": "INV-2026-092", "amount_paid": 5000 }')
   .font('Helvetica').text('• Response (200 OK):')
   .font('Courier').text('  { "success": true, "points_awarded": { "referrer": 350, "referee": 200 } }')
   .moveDown(0.8);

// Endpoint 3
doc.font('Helvetica-Bold').fontSize(10.5).text('3. POST /api/v1/loyalty/redeem-calculate')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• Purpose: Calculates the maximum points redeemable against a specific course fee.')
   .text('• Request Payload:')
   .font('Courier').text('  { "student_id": "BIA-2024-9042", "course_fee": 10000, "points_requested": 2000 }')
   .font('Helvetica').text('• Response (200 OK):')
   .font('Courier').text('  { "max_cap_percent": "30%", "max_discount_aed": 3000, "points_deducted": 2000, "discount_aed": 500, "final_payable_fee": 9500 }')
   .moveDown(0.8)
   .font('Helvetica-Oblique').fontSize(8.5).fillColor(colorTextMuted)
   .text('Note: If a student tries to deduct more points than their balance or exceeds the tier cap, the API clamps points_deducted to the maximum allowed limit.');

// ============================================================================
// PAGE 5: SHUKRAN-STYLE TIERS & MULTIPLIERS
// ============================================================================
doc.addPage();
drawSectionTitle('4. SHUKRAN-STYLE TIER MANAGEMENT & MULTIPLIERS');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('To encourage sustained engagement, we implement a Shukran-style tiered progression. Progression is calculated based on the number of verified successful referrals over a rolling 12-month period. Once a tier is achieved, the student unlocks enhanced earning capabilities:')
   .moveDown(1);

// Tier Box 1
doc.rect(45, doc.y, 505, 45).fill(colorBgLight);
doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(10).text('🥉 Bronze Tier (Classic Membership)', 55, doc.y + 8)
   .font('Helvetica').fontSize(8.5).fillColor(colorTextDark)
   .text('• Qualification: Default level on signup.', 55, doc.y + 20)
   .text('• Point Multiplier: 1.0x Rate  |  Redemption Cap: 30% of course fee.', 55, doc.y + 30);
doc.y += 55;

// Tier Box 2
doc.rect(45, doc.y, 505, 45).fill(colorBgLight);
doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(10).text('🥈 Silver Tier (Engagement Level)', 55, doc.y + 8)
   .font('Helvetica').fontSize(8.5).fillColor(colorTextDark)
   .text('• Qualification: Unlocked at 3 successful referrals.', 55, doc.y + 20)
   .text('• Point Multiplier: 1.1x Rate (e.g., 275 pts on base referrals)  |  Redemption Cap: 35%.', 55, doc.y + 30);
doc.y += 55;

// Tier Box 3
doc.rect(45, doc.y, 505, 45).fill(colorBgLight);
doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(10).text('🥇 Gold Tier (Super Advocate)', 55, doc.y + 8)
   .font('Helvetica').fontSize(8.5).fillColor(colorTextDark)
   .text('• Qualification: Unlocked at 5 successful referrals.', 55, doc.y + 20)
   .text('• Point Multiplier: 1.2x Rate (300 pts)  |  Redemption Cap: 40%  |  Reward: AED 250 Voucher.', 55, doc.y + 30);
doc.y += 55;

// Tier Box 4
doc.rect(45, doc.y, 505, 45).fill(colorBgLight);
doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(10).text('💎 Platinum Tier (Elite Partner)', 55, doc.y + 8)
   .font('Helvetica').fontSize(8.5).fillColor(colorTextDark)
   .text('• Qualification: Unlocked at 15 successful referrals.', 55, doc.y + 20)
   .text('• Point Multiplier: 1.3x Rate (325 pts)  |  Redemption Cap: 40%  |  Reward: VIP Alumni Gala Invite.', 55, doc.y + 30);
doc.y += 65;

doc.font('Helvetica-Bold').fontSize(10.5).fillColor(colorPrimary).text('Calculations and Tier Multipliers Logic:')
   .font('Helvetica').fontSize(9).fillColor(colorTextDark).moveDown(0.3)
   .text('Standard points are multiplied using the multiplier rate. (For example, if a Silver student completes a SkillShare activity normally worth 100 points, they are credited with 110 points). Point multipliers do not apply to first-referral super bonuses to maintain financial balance.');

// ============================================================================
// PAGE 6: POINTS EXPIRATION ALGORITHMS
// ============================================================================
doc.addPage();
drawSectionTitle('5. POINTS EXPIRATION ALGORITHMS & MATHEMATICS');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('The BIA Referral & Loyalty terms state: "Loyalty points are valid for 4 years. After 4 years, 50% of unused points expire, and the remaining 50% stay valid."')
   .moveDown(0.8)
   .text('To implement this without breaking calculations, we use a First-In-First-Out (FIFO) allocation ledger. Points are deducted from the oldest active transaction record first. When points reach their 4-year limit, the remaining unredeemed balance of that transaction is calculated, and a 50% deduction is applied.', { align: 'justify' })
   .moveDown(1)
   .font('Helvetica-Bold').fontSize(10.5).text('The Nightly Expiration Cron Algorithm (Pseudocode):')
   .font('Courier').fontSize(8).moveDown(0.3)
   .text('// Executed daily at 00:05 UTC')
   .text('SELECT DISTINCT user_id FROM points_ledger WHERE expires_at <= NOW() AND points_remaining > 0')
   .text('FOR EACH user_id IN users:')
   .text('    DECLARE expiring_records = SELECT * FROM points_ledger ')
   .text('                              WHERE user_id = user.id AND expires_at <= NOW() AND points_remaining > 0')
   .text('    FOR EACH record IN expiring_records:')
   .text('        DECLARE points_to_decay = FLOOR(record.points_remaining * 0.5)')
   .text('        // Credit the decay transaction')
   .text('        INSERT INTO points_ledger (user_id, points_change, event_type, description, expires_at, points_remaining)')
   .text('        VALUES (user.id, -points_to_decay, "Expiry", "50% Decay of expired credits", NULL, 0)')
   .text('        // Adjust remaining points on the record')
   .text('        UPDATE points_ledger ')
   .text('        SET points_remaining = record.points_remaining - points_to_decay,')
   .text('            expires_at = DATE_ADD(record.expires_at, INTERVAL 2 YEAR) // Extend the remainder')
   .text('        WHERE ledger_id = record.ledger_id')
   .text('        // Update user profile cache balance')
   .text('        UPDATE users SET points_balance = points_balance - points_to_decay WHERE user_id = user.id')
   .moveDown(1)
   .font('Helvetica-Bold').fontSize(10.5).fillColor(colorPrimary).text('Why this math is robust:')
   .font('Helvetica').fontSize(9).fillColor(colorTextDark).moveDown(0.3)
   .text('1. Audit trail is preserved: A negative ledger entry clearly explains points changes.')
   .text('2. Extensions are automated: The remaining 50% is pushed out by 2 years to prevent looping decays.')
   .text('3. Performance optimized: Indexes allow searching only the decaying records rather than the whole database.');

// ============================================================================
// PAGE 7: WHATSAPP BOT & LMS INTEGRATION
// ============================================================================
doc.addPage();
drawSectionTitle('6. WHATSAPP BUSINESS API & LMS INTEGRATIONS');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('To provide a premium Shukran-like experience, students must be able to interact with the engine from the platforms they use daily: WhatsApp and the BIA LMS (SkillShare portal).')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('1. WhatsApp Bot Microservice Interface')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('The BIA Whatsapp bot microservice communicates with the Loyalty Engine API. It decodes incoming webhook commands from the Twilio/360dialog sandbox:')
   .moveDown(0.4)
   .text('• Command: "/balance" or "check points"')
   .text('  Bot Reply: "Hello Sarah! Your points balance is 1,250 points, equivalent to AED 312.50. You are in Gold Tier (Progress: 5/15 referrals to Platinum)."', { indent: 10 })
   .moveDown(0.4)
   .text('• Command: "/referral"')
   .text('  Bot Reply: "Your unique referral link is: https://loyalty.bradfordia.com/ref/SARAH-9042. Share it with friends to earn up to 350 points per enrollment!"', { indent: 10 })
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('2. LMS & SkillShare Activity Sync')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('When a student completes an academic milestone or course on BIA’s internal LMS (e.g. SkillShare), the LMS triggers a POST hook:')
   .font('Courier').fontSize(8).moveDown(0.2)
   .text('POST https://loyalty.bradfordia.com/api/v1/loyalty/lms-complete')
   .text('Headers: { "X-BIA-LMS-Token": "secret_hash" }')
   .text('{ "student_email": "sarah@email.com", "activity_id": "cma_module_1", "points_value": 150 }')
   .font('Helvetica').fontSize(9).moveDown(0.6)
   .text('The engine verifies the token signature, calculates the student’s tier multiplier, logs the points credit (e.g., +180 points for Gold tier), and sends a WhatsApp confirmation alert.')
   .moveDown(0.8)
   .font('Helvetica-Oblique').fontSize(8.5).fillColor(colorTextMuted)
   .text('Note: Rate limiters on the LMS webhook verify that a student cannot earn points for the same course completion activity multiple times.');

// ============================================================================
// PAGE 8: SECURITY PROTOCOLS & COMPLIANCE
// ============================================================================
doc.addPage();
drawSectionTitle('7. SECURITY PROTOCOLS, ANTI-FRAUD MIDDLEWARE, & COMPLIANCE');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('A common vulnerability in loyalty programs is point manipulation and self-referrals (referring fake email accounts to generate points). We implement several security checks to protect BIA from financial exploitation:')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('A. Self-Referral Prevention Middleware')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('When a referred lead registers, the system records and cross-checks:')
   .text('• Device Fingerprints: Block registration if both referrer and referee shares the same device.')
   .text('• IP Address Clustering: Flags accounts registering multiple referees from the same IP within a 1-hour window.')
   .text('• Email Similarity Check: Rejects signups where the referee email mimics the referrer (e.g., sarah+test1@email.com).')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('B. Velocity Control Caps')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('To prevent script attacks from spamming links across online forums, we enforce velocity limiters:')
   .text('• Hourly Limit: Max 3 referral submissions per user per hour.')
   .text('• Monthly Cap: Max 10 successful point accruals from referrals per month. Subsequent referrals go to an Admin Hold Queue for manual review.')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('C. Ledger Balance Verification Checks')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('Before any point redemption is approved, the system runs an audit query:')
   .font('Courier').fontSize(8.5).text('  SELECT SUM(points_change) FROM points_ledger WHERE user_id = ?')
   .font('Helvetica').fontSize(9).text('The sum of the ledger records must exactly equal the user\'s current cached points balance. If there is a mismatch, the account is locked instantly, and an alert is sent to BIA admins.')
   .moveDown(0.8)
   .font('Helvetica-Bold').fontSize(10.5).text('D. UAE Legal Compliance')
   .font('Helvetica').fontSize(9).text('Under UAE consumer data laws, loyalty points are non-transferable, cannot be exchanged for physical cash, and expire within defined parameters. The terms and conditions are explicitly displayed to students in the portal signup forms.');

// ============================================================================
// PAGE 9: TIMELINES & QA TEST SUITE
// ============================================================================
doc.addPage();
drawSectionTitle('8. IMPLEMENTATION TIMELINES & QA TEST SUITE');

doc.fillColor(colorTextDark)
   .font('Helvetica')
   .fontSize(9.5)
   .lineGap(3.5)
   .text('Employing an intern paired with Antigravity AI allows BIA to launch this project in 12 days. Below is the operational schedule and the test suites the intern must execute to verify success:')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('Intern Deployment Action Plan (12 Days)')
   .font('Helvetica').fontSize(8.5).moveDown(0.2)
   .text('• Day 1-2 (Database Setup): Intern runs Laravel DB migrations and registers indexes.')
   .text('• Day 3-4 (Core API Controllers): Intern builds controllers for points earn, spend, and balances.')
   .text('• Day 5-6 (Expiration Scheduler): Intern writes daily scheduler console commands.')
   .text('• Day 7-8 (Webhook Listeners): Intern integrates LMS endpoints and test hooks.')
   .text('• Day 9-10 (Responsive Portal View): Intern designs responsive CSS mobile dashboards.')
   .text('• Day 11-12 (UAT & Go-Live): Intern executes tests and deploys production server.')
   .moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(10.5).text('Quality Assurance Testing Checklist')
   .font('Helvetica').fontSize(9).moveDown(0.2)
   .text('The intern must run these testing scripts before project handoff:')
   .moveDown(0.4)
   .font('Helvetica-Bold').fontSize(8.5)
   .text('1. Unit Test: point_accrual_test.php', { indent: 10 })
   .font('Helvetica').fontSize(8)
   .text('• Input: Submit referral for MBA program from a Gold Tier student.', { indent: 15 })
   .text('• Expected Output: Verify referrer balance increases by 250 points, and referee gets 200 points. Check ledger.', { indent: 15 })
   .moveDown(0.4)
   .font('Helvetica-Bold').fontSize(8.5)
   .text('2. Integration Test: points_expiration_mock_test.php', { indent: 10 })
   .font('Helvetica').fontSize(8)
   .text('• Input: Mock time to 4 years forward. Run console schedule command.', { indent: 15 })
   .text('• Expected Output: Check that 50% of the unused balance decays, and ledger records an Expiry transaction.', { indent: 15 })
   .moveDown(0.4)
   .font('Helvetica-Bold').fontSize(8.5)
   .text('3. Security Test: self_referral_block_test.php', { indent: 10 })
   .font('Helvetica').fontSize(8)
   .text('• Input: Trigger lead submission sharing the same device token or email alias.', { indent: 15 })
   .text('• Expected Output: System returns 403 Forbidden. Transaction ledger block verified.', { indent: 15 });

// ============================================================================
// WRAP UP: DYNAMIC PAGE HEADERS & FOOTERS FOR ALL PAGES
// ============================================================================
const range = doc.bufferedPageRange();
const totalPages = range.count;

for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    // Draw header/footer line shell (page numbers are 1-indexed)
    drawPageShell(i + 1, totalPages);
}

// Finalize stream
doc.end();

console.log('8-Page detailed proposal generated!');
