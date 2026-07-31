const { createClient } = require('@libsql/client');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbUrl = `file:${path.join(dbDir, 'loyalty.db')}`;

const db = createClient({
    url: dbUrl,
});

async function optimize() {
    try {
        console.log("Adding indexes to database for smoother performance...");
        
        // Users table
        await db.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
        
        // Ledger
        await db.execute('CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON points_ledger(user_id);');
        
        // Community
        await db.execute('CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_community_posts_date ON community_posts(created_at DESC);');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_community_upvotes_target ON community_upvotes(target_type, target_id);');
        
        // Vouchers
        await db.execute('CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers(user_id);');
        
        console.log("Database indexing complete!");
    } catch (err) {
        console.error("Optimization failed:", err);
    }
}

optimize();
