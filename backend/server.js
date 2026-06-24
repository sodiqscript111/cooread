const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { Database } = require('bun:sqlite');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Native Bun SQLite database
const dbPath = path.join(__dirname, 'users.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        monthly_usage INTEGER DEFAULT 0,
        last_reset_month INTEGER
    );
    CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        url TEXT UNIQUE,
        title TEXT,
        summary TEXT,
        category TEXT
    );
    CREATE TABLE IF NOT EXISTS user_saved_articles (
        user_email TEXT,
        article_id TEXT,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_email, article_id)
    );
    CREATE TABLE IF NOT EXISTS shared_libraries (
        share_token TEXT PRIMARY KEY,
        user_email TEXT,
        category TEXT
    );
    CREATE TABLE IF NOT EXISTS waitlist (
        email TEXT PRIMARY KEY,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Prepared Statements for high performance
const stmtGetUser = db.query('SELECT * FROM users WHERE email = $email');
const stmtInsertUser = db.query('INSERT INTO users (email, monthly_usage, last_reset_month) VALUES ($email, 1, $month)');
const stmtUpdateUser = db.query('UPDATE users SET monthly_usage = $usage, last_reset_month = $month WHERE email = $email');

const stmtGetArticleByUrl = db.query('SELECT * FROM articles WHERE url = $url');
const stmtInsertArticle = db.query('INSERT INTO articles (id, url, title, summary, category) VALUES ($id, $url, $title, $summary, $category)');

const stmtCheckSaved = db.query('SELECT 1 FROM user_saved_articles WHERE user_email = $email AND article_id = $article_id');
const stmtSaveUserArticle = db.query('INSERT OR IGNORE INTO user_saved_articles (user_email, article_id) VALUES ($email, $article_id)');

const stmtGetDashboard = db.query(`
    SELECT a.id, a.url, a.title, a.summary, a.category, u.saved_at 
    FROM user_saved_articles u 
    JOIN articles a ON u.article_id = a.id 
    WHERE u.user_email = $email
    ORDER BY u.saved_at DESC
`);

const stmtInsertShare = db.query('INSERT INTO shared_libraries (share_token, user_email, category) VALUES ($token, $email, $category)');
const stmtGetShare = db.query('SELECT user_email, category FROM shared_libraries WHERE share_token = $token');
const stmtGetSharedArticles = db.query(`
    SELECT a.id, a.url, a.title, a.summary, a.category, u.saved_at 
    FROM user_saved_articles u 
    JOIN articles a ON u.article_id = a.id 
    WHERE u.user_email = $email AND a.category = $category
    ORDER BY u.saved_at DESC
`);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper to check limits
const MAX_MONTHLY_EXPLANATIONS = 50;

function checkLimitAndLogUser(email) {
    const currentMonth = new Date().getMonth();
    const row = stmtGetUser.get({ $email: email });

    if (!row) {
        stmtInsertUser.run({ $email: email, $month: currentMonth });
        return true;
    } else {
        let { monthly_usage, last_reset_month } = row;
        if (last_reset_month !== currentMonth) {
            monthly_usage = 0;
            last_reset_month = currentMonth;
        }

        if (monthly_usage >= MAX_MONTHLY_EXPLANATIONS) {
            return false; // Limit reached
        }

        stmtUpdateUser.run({ $usage: monthly_usage + 1, $month: last_reset_month, $email: email });
        return true;
    }
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'CoReeder Bun Backend is running fast!' });
});

// Waitlist Endpoint
app.post('/api/waitlist', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const stmt = db.prepare('INSERT INTO waitlist (email) VALUES ($email)');
        stmt.run({ $email: email });
        res.json({ success: true, message: 'Joined waitlist successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            // Already joined
            res.json({ success: true, message: 'Already on the waitlist!' });
        } else {
            console.error('Waitlist error:', error);
            res.status(500).json({ error: 'Failed to join waitlist' });
        }
    }
});

// Original Explanation endpoint
app.post('/api/explain', async (req, res) => {
    try {
        let { prompt, email } = req.body;
        email = email || 'anonymous';
        console.log(`[${new Date().toISOString()}] Received /explain request from ${email}`);

        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        if (!checkLimitAndLogUser(email)) {
            return res.status(429).json({ error: "You've reached your free limit of 50 explanations for this month! Check back next month." });
        }

        if (prompt.length > 3000) {
            prompt = prompt.substring(0, 3000) + '... [Truncated due to length]';
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 512,
        });

        res.json({ text: response.choices[0]?.message?.content || 'No explanation was generated.' });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 1. Save Article Endpoint (Called when user reads 30%)
app.post('/api/articles/save', async (req, res) => {
    try {
        let { url, title, text, email } = req.body;
        email = email || 'anonymous';
        console.log(`[${new Date().toISOString()}] Received /save request from ${email} for ${url}`);

        if (!url || !title || !text) return res.status(400).json({ error: 'url, title, and text are required' });

        // Step 1: Check if article exists
        let article = stmtGetArticleByUrl.get({ $url: url });

        // Step 2: If new article, use AI to summarize and categorize
        if (!article) {
            const truncatedText = text.substring(0, 3000);
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { 
                        role: 'system', 
                        content: 'You analyze articles. Respond with a JSON object containing two keys: "summary" (a 2-sentence summary) and "category" (a single broad category like "Technology", "Philosophy", "News", "Research Paper", etc).'
                    },
                    { role: 'user', content: `Title: ${title}\n\nText: ${truncatedText}` }
                ],
                temperature: 0.3,
            });

            const result = JSON.parse(response.choices[0].message.content);
            const articleId = crypto.randomUUID();

            stmtInsertArticle.run({
                $id: articleId,
                $url: url,
                $title: title,
                $summary: result.summary || 'No summary available.',
                $category: result.category || 'Uncategorized'
            });

            article = { id: articleId };
        }

        // Step 3: Link article to user
        stmtSaveUserArticle.run({ $email: email, $article_id: article.id });
        
        res.json({ success: true, message: 'Article saved to your library!' });
    } catch (error) {
        console.error('Save Article Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. User Dashboard Library Endpoint
app.get('/api/dashboard/library', (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'email query parameter is required' });

        const articles = stmtGetDashboard.all({ $email: email });
        
        // Group by category
        const library = articles.reduce((acc, article) => {
            if (!acc[article.category]) acc[article.category] = [];
            acc[article.category].push(article);
            return acc;
        }, {});

        res.json({ library });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Share Library Category Endpoint
app.post('/api/library/share', (req, res) => {
    try {
        const { email, category } = req.body;
        if (!email || !category) return res.status(400).json({ error: 'email and category are required' });

        const shareToken = crypto.randomBytes(8).toString('hex');
        
        stmtInsertShare.run({
            $token: shareToken,
            $email: email,
            $category: category
        });

        res.json({ shareUrl: `/shared/${shareToken}` });
    } catch (error) {
        console.error('Share Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. View Shared Library Endpoint
app.get('/api/shared/:token', (req, res) => {
    try {
        const { token } = req.params;
        const shareData = stmtGetShare.get({ $token: token });

        if (!shareData) return res.status(404).json({ error: 'Shared library not found' });

        const articles = stmtGetSharedArticles.all({
            $email: shareData.user_email,
            $category: shareData.category
        });

        res.json({
            category: shareData.category,
            owner: shareData.user_email, // You might want to mask this in production
            articles
        });
    } catch (error) {
        console.error('Shared Library Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on port ${port}`);
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNING: OPENAI_API_KEY is missing from your .env file!');
    }
});
