import { supabase, supabaseAdmin } from '../config/database.js';
import CreditTransactionModel from '../models/CreditTransaction.js';
import NotificationService from './NotificationService.js';

const getClient = () => supabaseAdmin || supabase;

export class CreditService {
  static async getMyTransactions(userId) {
    return await CreditTransactionModel.getByUser(userId);
  }

  /**
   * Add credits to a user and record the transaction
   * @param {string} userId - ID of the user
   * @param {number} amount - Amount of credits to add
   * @param {string} type - Transaction type (PURCHASE, EARN)
   * @param {string} sessionId - Optional UUID of a session if related to a collaboration
   * @param {string} description - Optional description/reason
   * @returns {Promise<Object>} The updated transaction record
   */
  static async addCredits(userId, amount, type, sessionId = null, description = null) {
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) throw new Error('Invalid amount provided to addCredits');

      // 1. Record the transaction (only include session_id if provided)
      const transactionData = {
        user_id: userId,
        amount: numAmount,
        type: type,
        created_at: new Date().toISOString()
      };
      if (sessionId) transactionData.session_id = sessionId;
      if (description) transactionData.description = description;

      const [transaction] = await CreditTransactionModel.createMany([transactionData]);

      if (!transaction) throw new Error('Failed to create credit transaction record');

      // 2. Fetch current user credits
      const { data: user, error: fetchError } = await getClient()
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // 3. Update user credits
      const newBalance = (user.credits || 0) + parseInt(amount);
      const { error: updateError } = await getClient()
        .from('users')
        .update({ credits: newBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 4. Send notification for certain types (if not silent)
      const notifyTypes = {
        'PURCHASE': { title: 'Credits Purchased', content: `Success! ${amount} credits have been added to your account.` },
        'BONUS': { title: 'Bonus Credits', content: `You've received ${amount} bonus credits!` },
        'ACHIEVEMENT': { title: 'Achievement Reward', content: `Congratulations! You earned ${amount} credits for unlocking an achievement.` },
        'EARN': { title: 'Credits Earned', content: `You earned ${amount} credits from a session.` },
      };

      if (notifyTypes[type]) {
        await NotificationService.send(userId, 'CREDIT_ADDED', notifyTypes[type].title, notifyTypes[type].content, '/profile');
      }

      return transaction;
    } catch (error) {
      console.error('Error in CreditService.addCredits:', error.message);
      throw error;
    }
  }

  /**
   * Deduct credits from a user and record the transaction
   * @param {string} userId - ID of the user
   * @param {number} amount - Amount of credits to deduct
   * @param {string} type - Transaction type (TRANSFER, ADMIN_DEDUCT, etc.)
   * @param {string} description - Optional description/metadata
   * @returns {Promise<Object>} The updated transaction record
   */
  static async deductCredits(userId, amount, type, description = null) {
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) throw new Error('Invalid amount provided to deductCredits');

      // Use 'SPEND' if 'REDEMPTION' is passed to avoid database constraint violations
      const transactionType = type === 'REDEMPTION' ? 'SPEND' : type;

      // 1. Record the transaction (negative amount)
      const transactionData = {
        user_id: userId,
        amount: -numAmount,
        type: transactionType,
        created_at: new Date().toISOString()
      };
      
      if (description) transactionData.description = description;

      const [transaction] = await CreditTransactionModel.createMany([transactionData]);

      if (!transaction) throw new Error('Failed to create credit transaction record');

      // 2. Fetch current user credits
      const { data: user, error: fetchError } = await getClient()
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // 3. Update user credits (ensure not negative)
      const oldBalance = user.credits || 0;
      const newBalance = Math.max(0, oldBalance - numAmount);
      
      console.log(`[CreditService] Deducting credits for user ${userId}. Old: ${oldBalance}, Deduct: ${numAmount}, New: ${newBalance}`);

      const { error: updateError } = await getClient()
        .from('users')
        .update({ credits: newBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 4. Send notification for SPEND type
      if (type === 'SPEND') {
        await NotificationService.send(userId, 'CREDIT_DEDUCTED', 'Credits Spent', `You spent ${amount} credits on a session.`, '/profile');
      }

      return transaction;
    } catch (error) {
      console.error('Error in CreditService.deductCredits:', error.message);
      throw error;
    }
  }
}

export default CreditService;
