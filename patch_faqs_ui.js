const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');

// 1. Update Footer Link
index = index.replace('<li><a href="#tiers">FAQs</a></li>', '<li><a href="#" onclick="showFAQModal(); return false;">FAQs</a></li>');

// 2. Add Admin Sidebar Button
const adminTabHTML = `                <button class="nav-tab admin-only" data-target="admin-health"><i class="fa-solid fa-server"></i> System Health</button>
                <button class="nav-tab admin-only" data-target="admin-faqs"><i class="fa-solid fa-circle-question"></i> FAQs (Inbox)</button>`;
index = index.replace('                <button class="nav-tab admin-only" data-target="admin-health"><i class="fa-solid fa-server"></i> System Health</button>', adminTabHTML);

// 3. Add Admin Tab Content
const adminContentHTML = `
            <!-- ADMIN: FAQs (INBOX) TAB -->
            <div id="admin-faqs" class="tab-content admin-only">
                <div class="card ledger-card glassmorphic spotlight-card">
                    <h3><i class="fa-solid fa-circle-question"></i> Student Questions (FAQs)</h3>
                    <p class="section-desc">Review and manage questions submitted by students. Mark them as resolved to remove them from this view.</p>
                    
                    <div class="table-scroll-container">
                        <table class="ledger-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student Name</th>
                                    <th>Student ID</th>
                                    <th>Question</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="admin-faqs-body">
                                <tr><td colspan="5" class="no-data">Loading submitted questions...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </main>`;
index = index.replace('        </main>', adminContentHTML);

// 4. Add FAQ Modal
const faqModalHTML = `
    <!-- Comprehensive FAQ Modal -->
    <div id="faq-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 11, 14, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 25000; align-items: center; justify-content: center;">
        <div class="card glassmorphic spotlight-card" style="max-width: 650px; width: 90%; padding: 2.25rem; border: 1px solid rgba(223, 177, 91, 0.15); border-radius: 16px; position: relative; background: #0c0d12; box-shadow: 0 20px 50px rgba(0,0,0,0.6); max-height: 85vh; display: flex; flex-direction: column;">
            <button onclick="document.getElementById('faq-modal').style.display='none'" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1.25rem; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 style="margin-top: 0; color: #EFECE3; font-family: 'DM Serif Display', serif; font-size: 1.75rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-circle-question" style="color: #dfb15b; font-size: 1.3rem; margin-right: 0.5rem;"></i> Frequently Asked Questions</h3>
            <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-bottom: 1.5rem;">Find answers to common questions, or drop us a message below.</p>
            
            <div style="flex: 1; overflow-y: auto; padding-right: 0.5rem; scrollbar-width: thin; scrollbar-color: rgba(223,177,91,0.2) transparent; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Basic Questions -->
                <div class="faq-list" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">How do I earn Loyalty Points?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Points are earned by logging in daily, maintaining a high GPA, attending BIA executive webinars, and referring friends who successfully enroll.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">When do my points or vouchers expire?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Loyalty points expire 12 months after issuance. Vouchers typically remain valid for 90 days after generation, unless stated otherwise.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">Can I transfer points to a friend?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Yes! You can transfer points peer-to-peer from the Overview dashboard. Note that a 10% system tax is deducted from the sent amount.</p>
                    </div>
                </div>

                <!-- Submit Form -->
                <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem;">
                    <h4 style="margin-top: 0; margin-bottom: 1rem; color: #EFECE3;"><i class="fa-solid fa-paper-plane" style="color: #dfb15b; font-size: 1rem; margin-right: 0.4rem;"></i> Ask a Question</h4>
                    <form id="faq-submit-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <textarea id="faq-question-text" required placeholder="Type your question here... Our admin team will review it." style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 0.75rem; color: #fff; font-family: inherit; font-size: 0.85rem; min-height: 80px; resize: vertical; box-sizing: border-box;"></textarea>
                        <button type="submit" class="btn btn-primary" style="align-self: flex-end; display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                            Submit Question <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </form>
                </div>
                
            </div>
        </div>
    </div>

</body>`;
if (!index.includes('faq-modal')) {
    index = index.replace('</body>', faqModalHTML);
}

fs.writeFileSync('public/index.html', index, 'utf8');
console.log('index.html updated successfully!');
