import { supabase, supabaseAdmin } from '../config/database.js';
import { NotificationService } from '../services/NotificationService.js';
import AchievementService from '../services/AchievementService.js';
import CreditService from '../services/CreditService.js';

const getClient = () => supabaseAdmin || supabase;

// Admin emails configuration
const ADMIN_EMAILS = ['admin@collixa.space'];

/**
 * Check if email is admin
 */
const isAdminEmail = (email) => email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());

// Log initialization status
if (!supabaseAdmin) {
  console.warn('[AdminController] Warning: supabaseAdmin is not initialized (missing service role key). Admin operations will be subject to RLS policies via anon client.');
} else {
  console.log('[AdminController] Initialized with supabaseAdmin.');
}

export class AdminController {
  /**
   * Get admin dashboard stats
   */
  static async getStats(req, res, next) {
    try {
      const client = getClient();

      // Get total users count
      const { count: totalUsers, error: usersError } = await client
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get total intents count
      const { count: totalIntents, error: intentsError } = await client
        .from('intents')
        .select('*', { count: 'exact', head: true });

      // Get total skills/tribes count
      const { count: totalTribes, error: tribesError } = await client
        .from('skills')
        .select('*', { count: 'exact', head: true });

      // Get total sessions count (scheduled sessions)
      const { count: totalSessions, error: sessionsError } = await client
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      // Get total credits in system
      const { data: creditsData, error: creditsError } = await client
        .from('users')
        .select('credits');

      const totalCredits = creditsData?.reduce((sum, user) => sum + (user.credits || 0), 0) || 0;

      // Get new users today
      const today = new Date().toISOString().split('T')[0];
      const { count: newUsersToday, error: newUsersError } = await client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get total achievements unlocked
      const { count: totalAchievements, error: achievementsError } = await client
        .from('user_achievements')
        .select('*', { count: 'exact', head: true });

      if (usersError || intentsError || tribesError || sessionsError || creditsError || achievementsError) {
        throw new Error('Failed to fetch stats');
      }

      return res.status(200).json({
        success: true,
        data: {
          totalUsers: totalUsers || 0,
          totalIntents: totalIntents || 0,
          totalTribes: totalTribes || 0,
          totalSessions: totalSessions || 0,
          totalCredits: totalCredits,
          totalAchievements: totalAchievements || 0,
          newUsersToday: newUsersToday || 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users
   */
  static async getAllUsers(req, res, next) {
    try {
      const client = getClient();

      const { data: users, error } = await client
        .from('users')
        .select('id, email, name, avatar_url, credits, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: users || []
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const adminClient = supabaseAdmin || getClient();

      // Check if trying to delete an admin
      const { data: userToDelete, error: fetchError } = await adminClient
        .from('users')
        .select('email')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isAdminEmail(userToDelete.email)) {
        return res.status(403).json({
          error: 'Cannot delete admin users'
        });
      }

      // 1. Manually clean up associated records to prevent FK constraint errors
      // Use adminClient to bypass RLS policies
      
      console.log(`[AdminDelete] Starting cleanup for user ${id}`);

      // --- STAGE 1: CHAT & CONVERSATIONS ---
      // We must delete messages in conversations the user is in, even if sent by others,
      // to allow the conversation itself to be deleted.
      const { data: userConvs } = await adminClient
        .from('conversations')
        .select('id')
        .or(`participant_1.eq.${id},participant_2.eq.${id},admin_id.eq.${id}`);
      
      const convIds = userConvs?.map(c => c.id) || [];

      if (convIds.length > 0) {
        console.log(`[AdminDelete] Clearing ${convIds.length} conversations...`);
        // Delete all messages in these conversations (from any sender)
        await adminClient.from('messages').delete().in('conversation_id', convIds);
        // Delete all participant records for these conversations
        await adminClient.from('conversation_participants').delete().in('conversation_id', convIds);
        // Delete the conversations themselves
        await adminClient.from('conversations').delete().in('id', convIds);
      }

      // Also ensure any loose messages or participant records for this user are gone
      await adminClient.from('messages').delete().eq('sender_id', id);
      await adminClient.from('conversation_participants').delete().eq('user_id', id);

      // --- STAGE 2: SESSIONS & REVIEWS ---
      // Reviews depend on sessions
      await adminClient.from('session_reviews').delete().or(`reviewer_id.eq.${id},reviewee_id.eq.${id}`);
      
      // Sessions depend on skill_exchanges
      await adminClient.from('sessions').delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      
      // --- STAGE 3: EXCHANGES & TRANSFERS ---
      await adminClient.from('skill_exchanges').delete().or(`requester_id.eq.${id},provider_id.eq.${id}`);
      await adminClient.from('credit_transfers').delete().or(`sender_id.eq.${id},recipient_id.eq.${id}`);
      
      // --- STAGE 4: INTENTS & SKILLS ---
      // Collaboration requests depend on intents
      await adminClient.from('collaboration_requests').delete().eq('user_id', id);
      
      // Delete intents (and capture IDs for further cleanup if needed)
      // Note: we already cleared related collaboration_requests in stage 4.1
      await adminClient.from('intents').delete().eq('created_by', id);
      
      // Delete skills
      await adminClient.from('skills').delete().eq('user_id', id);
      
      // --- STAGE 5: FINANCES & ACHIEVEMENTS ---
      await adminClient.from('credit_transactions').delete().eq('user_id', id);
      await adminClient.from('user_achievements').delete().eq('user_id', id);
      await adminClient.from('notifications').delete().eq('user_id', id);
      await adminClient.from('user_ratings').delete().eq('user_id', id);

      // --- STAGE 6: FINAL USER REMOVAL ---
      console.log(`[AdminDelete] Cleanup complete. Removing user record...`);
      const { error } = await adminClient
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database deletion error:', error);
        throw error;
      }

      // 3. Also delete from Supabase Auth if admin client available
      if (supabaseAdmin) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
          console.warn('Auth deletion warning:', authError.message);
          // Don't fail the whole request if DB deletion succeeded but auth failed
        }
      }

      return res.status(200).json({
        success: true,
        message: 'User and all associated data deleted successfully'
      });
    } catch (error) {
      console.error('Admin delete user error:', error);
      next(error);
    }
  }

  /**
   * Ban a user
   */
  static async banUser(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('users')
        .update({ role: 'BANNED', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'User banned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unban a user
   */
  static async unbanUser(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('users')
        .update({ role: 'VERIFIED_USER', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'User unbanned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all intents
   */
  static async getAllIntents(req, res, next) {
    try {
      const client = getClient();

      const { data: intents, error } = await client
        .from('intents')
        .select(`
          *,
          users!intents_created_by_fkey(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback if the named relationship fails
        const { data: fallbackIntents, error: fallbackError } = await client
          .from('intents')
          .select(`
            *,
            created_by_user:users(id, name, email, avatar_url)
          `)
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        
        // Map created_by_user to created_by for frontend compatibility
        const mappedIntents = (fallbackIntents || []).map(i => ({
          ...i,
          created_by: i.created_by_user || i.created_by
        }));

        return res.status(200).json({
          success: true,
          data: mappedIntents
        });
      }

      // Map users to created_by for frontend compatibility if using the explicit join
      const enrichedIntents = (intents || []).map(i => ({
        ...i,
        created_by: i.users || i.created_by
      }));

      return res.status(200).json({
        success: true,
        data: enrichedIntents
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get intent by ID
   */
  static async getIntentById(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { data: intent, error } = await client
        .from('intents')
        .select(`
          *,
          users!intents_created_by_fkey(id, name, email, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
         // Fallback
         const { data: fallbackIntent, error: fallbackError } = await client
           .from('intents')
           .select(`
             *,
             created_by_user:users(id, name, email, avatar_url)
           `)
           .eq('id', id)
           .single();
         
         if (fallbackError) throw fallbackError;
         
         return res.status(200).json({
           success: true,
           data: { ...fallbackIntent, created_by: fallbackIntent.created_by_user || fallbackIntent.created_by }
         });
      }

      return res.status(200).json({
        success: true,
        data: { ...intent, created_by: intent.users || intent.created_by }
      });

      return res.status(200).json({
        success: true,
        data: intent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an intent
   */
  static async updateIntent(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, category, location, status, rejection_reason } = req.body;
      const client = getClient();

      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (location !== undefined) updates.location = location;
      if (status !== undefined) updates.status = status;
      if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason;
      updates.updated_at = new Date().toISOString();

      const { data: intent, error } = await client
        .from('intents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Intent updated successfully',
        data: intent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an intent
   */
  static async deleteIntent(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('intents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Intent deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Force complete an intent (Admin override)
   */
  static async forceCompleteIntent(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { data, error } = await client
        .from('intents')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Intent force-completed by admin',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tribes/skills
   */
  static async getAllTribes(req, res, next) {
    try {
      const client = getClient();

      const { data: tribes, error } = await client
        .from('skills')
        .select(`
          *,
          user:users(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: tribes || []
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a tribe/skill
   */
  static async deleteTribe(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('skills')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Tribe deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a tribe/skill
   */
  static async updateTribe(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, category, hourly_rate, status } = req.body;
      const client = getClient();

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate;
      if (status !== undefined) updateData.status = status;

      const { data, error } = await client
        .from('skills')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Tribe updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sessions
   */
  static async getAllSessions(req, res, next) {
    try {
      const client = getClient();

      const { data: sessions, error } = await client
        .from('sessions')
        .select(`
          *,
          exchange:skill_exchanges(
            id,
            skill:skills(id, name)
          ),
          learner:users!sessions_sender_id_fkey(id, name, email),
          teacher:users!sessions_receiver_id_fkey(id, name, email)
        `)
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('[AdminController] Error fetching sessions:', error);
        throw error;
      }

      // Map to frontend format
      const mappedSessions = (sessions || []).map(s => ({
        ...s,
        scheduled_at: s.scheduled_time,
        skill: s.exchange?.skill || { name: 'Deleted Tribe' },
        learner: s.learner,
        teacher: s.teacher
      }));

      return res.status(200).json({
        success: true,
        data: mappedSessions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark session as completed
   */
  static async completeSession(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('sessions')
        .update({ status: 'COMPLETED' })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Session marked as completed'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a session
   */
  static async cancelSession(req, res, next) {
    try {
      const { id } = req.params;
      const client = getClient();

      const { error } = await client
        .from('sessions')
        .update({ status: 'CANCELLED' })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Session cancelled'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credit transactions
   */
  static async getCreditTransactions(req, res, next) {
    try {
      const client = getClient();

      const { data: transactions, error } = await client
        .from('credit_transactions')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process transactions to show REDEEM instead of SPEND for voucher exchanges
      const processedTransactions = (transactions || []).map(tx => {
        if (tx.type === 'SPEND' && tx.description) {
          try {
            const meta = typeof tx.description === 'string' ? JSON.parse(tx.description) : tx.description;
            if (meta && meta.isRedemption) {
              return { ...tx, type: 'REDEEM' };
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        return tx;
      });

      return res.status(200).json({
        success: true,
        data: processedTransactions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add credits to user
   */
  static async addCredits(req, res, next) {
    try {
      const { userId, amount, reason } = req.body;
      
      const transaction = await CreditService.addCredits(
        userId, 
        amount, 
        'ADMIN_ADD', 
        null, 
        reason || 'Admin credit addition'
      );

      // Fetch the new balance to return to frontend
      const { data: user } = await getClient()
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      return res.status(200).json({
        success: true,
        message: `${amount} credits added successfully`,
        data: { newBalance: user?.credits || 0 }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deduct credits from user
   */
  static async deductCredits(req, res, next) {
    try {
      const { userId, amount, reason } = req.body;
      
      const transaction = await CreditService.deductCredits(
        userId, 
        amount, 
        'ADMIN_DEDUCT', 
        reason || 'Admin credit deduction'
      );

      // Send notification to user (CreditService.deductCredits only notifies for SPEND type)
      await NotificationService.send(
        userId,
        'CREDIT_DEDUCTED',
        'Credits Deducted',
        `Admin has deducted ${amount} credits from your account. Reason: ${reason || 'Admin adjustment'}`,
        '/profile'
      );

      // Fetch the new balance to return to frontend
      const { data: user } = await getClient()
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      return res.status(200).json({
        success: true,
        message: `${amount} credits deducted successfully`,
        data: { newBalance: user?.credits || 0 }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get achievement statistics
   */
  static async getAchievementStats(req, res, next) {
    try {
      const stats = await AchievementService.getGlobalAchievementStats();
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reports (placeholder - can be extended with actual reporting)
   */
  static async getReports(req, res, next) {
    try {
      // This can be extended to include flagged content, reports from users, etc.
      return res.status(200).json({
        success: true,
        data: {
          message: 'Reports feature - extend as needed',
          flaggedIntents: [],
          flaggedUsers: [],
          recentReports: []
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminController;
