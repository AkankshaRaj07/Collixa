/**
 * Database Initialization Script
 * This script sets up the necessary tables in Supabase
 * Run this once to initialize the database
 */

import { supabaseAdmin } from '../config/database.js';

/**
 * Create collaboration_requests table if it doesn't exist
 */
export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    const bootstrapSQL = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) NOT NULL DEFAULT 'Nomad';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_genesis_completed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS target_goal TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cached_recommendations JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recommendations_updated_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cached_roadmap JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roadmap_updated_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cached_matches JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS matches_updated_at TIMESTAMP WITH TIME ZONE;

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID NOT NULL REFERENCES skill_exchanges(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        meeting_link TEXT,
        sender_confirmed BOOLEAN DEFAULT FALSE,
        receiver_confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure columns exist in case table was created previously
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sender_confirmed BOOLEAN DEFAULT FALSE;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS receiver_confirmed BOOLEAN DEFAULT FALSE;

      CREATE INDEX IF NOT EXISTS idx_sessions_request_id ON sessions(request_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_sender_id ON sessions(sender_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_receiver_id ON sessions(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

      -- Credit transfers table for sharing credits
      CREATE TABLE IF NOT EXISTS credit_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        fee_amount INTEGER DEFAULT 0,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_credit_transfers_sender_id ON credit_transfers(sender_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transfers_recipient_id ON credit_transfers(recipient_id);
      ALTER TABLE credit_transfers ADD COLUMN IF NOT EXISTS fee_amount INTEGER DEFAULT 0;

      -- User achievements table
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id VARCHAR(50) NOT NULL,
        achievement_name VARCHAR(255) NOT NULL,
        achievement_description TEXT,
        achievement_icon VARCHAR(50),
        reward INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('EARN', 'SPEND', 'PURCHASE', 'TRANSFER', 'ACHIEVEMENT', 'ADMIN_ADD', 'ADMIN_DEDUCT', 'FEE')),
        description TEXT,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration for existing table structure if needed
      ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
      ALTER TABLE credit_transactions ALTER COLUMN type TYPE VARCHAR(20);
      ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
      ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check CHECK (type IN ('EARN', 'SPEND', 'PURCHASE', 'TRANSFER', 'ACHIEVEMENT', 'ADMIN_ADD', 'ADMIN_DEDUCT', 'FEE', 'BONUS', 'REDEMPTION'));
      ALTER TABLE credit_transactions ALTER COLUMN session_id DROP NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_session_id ON credit_transactions(session_id);

      CREATE TABLE IF NOT EXISTS session_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        intent_id INTEGER REFERENCES intents(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, reviewer_id),
        UNIQUE(intent_id, reviewer_id)
      );

      -- Migration for existing session_reviews if it was created without intent_id
      ALTER TABLE session_reviews ALTER COLUMN session_id DROP NOT NULL;
      ALTER TABLE session_reviews ADD COLUMN IF NOT EXISTS intent_id INTEGER REFERENCES intents(id) ON DELETE CASCADE;
      ALTER TABLE session_reviews DROP CONSTRAINT IF EXISTS session_reviews_intent_id_reviewer_id_key;
      ALTER TABLE session_reviews ADD CONSTRAINT session_reviews_intent_id_reviewer_id_key UNIQUE(intent_id, reviewer_id);

      CREATE INDEX IF NOT EXISTS idx_session_reviews_session_id ON session_reviews(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_reviews_reviewee_id ON session_reviews(reviewee_id);

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

      -- XP Transactions for History
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL, -- e.g., 'ACHIEVEMENT', 'GENESIS', 'ENGAGEMENT'
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);

      -- Views for Aggregated Ratings
      CREATE OR REPLACE VIEW skill_ratings AS
      SELECT 
        e.skill_id,
        AVG(r.rating) as avg_rating,
        COUNT(r.id) as review_count
      FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      JOIN skill_exchanges e ON s.request_id = e.id
      GROUP BY e.skill_id;

      CREATE OR REPLACE VIEW user_ratings AS
      SELECT 
        reviewee_id as user_id,
        AVG(rating) as avg_rating,
        COUNT(id) as total_reviews
      FROM session_reviews
      GROUP BY reviewee_id;
      -- Update intents table for 1-on-1 collaboration
      ALTER TABLE intents ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES users(id);
      ALTER TABLE intents ADD COLUMN IF NOT EXISTS creator_confirmed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE intents ADD COLUMN IF NOT EXISTS collaborator_confirmed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE intents ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
      
      -- Ensure intents status check constraint allows 'in_progress'
      ALTER TABLE intents DROP CONSTRAINT IF EXISTS intents_status_check;
      ALTER TABLE intents ADD CONSTRAINT intents_status_check CHECK (status IN ('pending', 'looking', 'in_progress', 'completed', 'rejected'));

      -- Tribe Group Support
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 5;
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]';
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS meeting_link TEXT;
    `;

    if (!supabaseAdmin) {
      console.warn('⚠️  supabaseAdmin is not configured. Skipping schema check.');
    } else {
      const { error } = await supabaseAdmin.rpc('exec', { sql: bootstrapSQL });
      if (error) {
        console.info('ℹ️  Automated schema update via RPC skipped (Restricted Permissions).');
        console.log('📝 Ensure your database has: users(age, gender), user_achievements, notifications.');
      } else {
        console.log('✅ Session, credit, and review schema ensured via RPC');
      }
    }

    console.log('✨ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Open your project SQL editor');
    console.log('3. Run the following SQL:');
    console.log(`
      CREATE TABLE IF NOT EXISTS collaboration_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id INTEGER NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(intent_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_collaboration_requests_intent_id ON collaboration_requests(intent_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_requests_user_id ON collaboration_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_requests_status ON collaboration_requests(status);
    `);
  }
};

export default initializeDatabase;
