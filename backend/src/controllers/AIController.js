import AIService from '../services/AIService.js';
import IntentService from '../services/IntentService.js';
import SkillService from '../services/SkillService.js';
import AuthService from '../services/AuthService.js';

export class AIController {
  /**
   * Get personalized recommendations for intents and partners
   * GET /api/ai/recommendations
   */
  static async getRecommendations(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await AuthService.getProfile(userId);
      
      const CACHE_TTL = 60 * 60 * 1000; // 1 hour
      const now = new Date();
      const lastUpdated = user.recommendations_updated_at ? new Date(user.recommendations_updated_at) : null;

      // 1. Check Cache Validity
      if (user.cached_recommendations && lastUpdated && (now - lastUpdated < CACHE_TTL)) {
        console.log(`[AIController] Serving cached recommendations for user ${userId}`);
        const cached = typeof user.cached_recommendations === 'string' 
          ? JSON.parse(user.cached_recommendations) 
          : user.cached_recommendations;
          
        return res.status(200).json(cached);
      }

      console.log(`[AIController] Cache stale/missing for user ${userId}. Fetching fresh AI recommendations...`);

      // 2. Fetch available pool of intents and skills
      const [allIntents, allSkills] = await Promise.all([
        IntentService.getAllIntents(),
        SkillService.searchSkills({})
      ]);

      // 3. Filter out own intents and skills for recommendations
      const otherIntents = allIntents.filter(i => i.created_by !== userId && i.status === 'looking');
      const otherSkills = allSkills.filter(s => s.user_id !== userId);

      // 4. Use Unified AI Call (Consolidated to save quota)
      const freshRecommendations = await AIService.getUnifiedRecommendations(
        user, 
        otherIntents.slice(0, 10), 
        otherSkills.slice(0, 10)
      );

      // 5. Update Cache in Database (Non-blocking or gracefully handled)
      try {
        await AuthService.updateProfile(userId, {
          cached_recommendations: freshRecommendations,
          recommendations_updated_at: now.toISOString()
        });
      } catch (dbError) {
        // If columns don't exist yet, we just log and skip caching
        console.warn('[AIController] Cache persistence failed (columns may be missing):', dbError.message);
      }

      res.status(200).json(freshRecommendations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate match score for a specific intent
   * GET /api/ai/match/intent/:intentId
   */
  static async matchWithIntent(req, res, next) {
    try {
      const userId = req.user.id;
      const { intentId } = req.params;
      
      const [user, intent] = await Promise.all([
        AuthService.getProfile(userId),
        IntentService.getIntentById(intentId)
      ]);

      // 1. Check Cache Validity
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
      const now = new Date();
      const cachedMatches = user.cached_matches ? (typeof user.cached_matches === 'string' ? JSON.parse(user.cached_matches) : user.cached_matches) : {};
      const cacheKey = `intent_${intentId}`;

      if (cachedMatches[cacheKey] && user.matches_updated_at && (now - new Date(user.matches_updated_at) < CACHE_TTL)) {
        console.log(`[AIController] Serving cached match for intent ${intentId}`);
        return res.status(200).json({ success: true, data: cachedMatches[cacheKey] });
      }

      // 2. Generate fresh match
      const match = await AIService.calculateMatch(user, intent);
      
      // 3. Update Cache
      cachedMatches[cacheKey] = match;
      AuthService.updateProfile(userId, {
        cached_matches: cachedMatches,
        matches_updated_at: now.toISOString()
      }).catch(err => console.warn('[AIController] Match cache save failed:', err.message));

      res.status(200).json({ success: true, data: match });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unified match endpoint
   * POST /api/ai/match
   */
  static async match(req, res, next) {
    try {
      const userId = req.user.id;
      const { type, itemId, itemTitle, itemDescription } = req.body;

      console.log(`[AIController] Matching user ${userId} with ${type} ${itemId}`);

      const user = await AuthService.getProfile(userId);
      let targetData = { title: itemTitle, description: itemDescription };

      // In the future, we could fetch full objects if itemId is provided
      // but passing them from frontend is faster for initial display.

      // 1. Check Cache Validity
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
      const now = new Date();
      const cachedMatches = user.cached_matches ? (typeof user.cached_matches === 'string' ? JSON.parse(user.cached_matches) : user.cached_matches) : {};
      const cacheKey = `${type}_${itemId || itemTitle}`;

      if (cachedMatches[cacheKey] && user.matches_updated_at && (now - new Date(user.matches_updated_at) < CACHE_TTL)) {
        console.log(`[AIController] Serving cached match for ${type} ${itemId || itemTitle}`);
        return res.status(200).json({ success: true, data: cachedMatches[cacheKey] });
      }

      // 2. Generate fresh match
      const match = await AIService.calculateMatch(user, targetData, type);
      
      // 3. Update Cache
      cachedMatches[cacheKey] = match;
      AuthService.updateProfile(userId, {
        cached_matches: cachedMatches,
        matches_updated_at: now.toISOString()
      }).catch(err => console.warn('[AIController] Match cache save failed:', err.message));

      res.status(200).json({ success: true, data: match });
    } catch (error) {
      console.error('[AIController] Match error:', error);
      next(error);
    }
  }

  /**
   * Generate a learning roadmap for a goal
   * POST /api/ai/learning-path
   */
  static async generateLearningPath(req, res, next) {
    try {
      const userId = req.user.id;
      let { goal } = req.body;
      
      if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
        return res.status(400).json({ error: 'A clear collaborative goal is required to generate a roadmap.' });
      }

      goal = goal.trim();

      console.log(`[AIController] Roadmap requested for user ${userId} and goal: "${goal}"`);

      // 1. Fetch user profile to check cache
      const user = await AuthService.getProfile(userId);
      
      // 2. Check Cache Validity
      // We check if cached_roadmap exists AND if it was generated for the SAME goal
      const cached = user.cached_roadmap ? (typeof user.cached_roadmap === 'string' ? JSON.parse(user.cached_roadmap) : user.cached_roadmap) : null;
      
      if (cached && cached.goal === goal && !cached.isFallback) {
        console.log(`[AIController] Serving cached roadmap for goal: "${goal}"`);
        return res.status(200).json({ 
          success: true, 
          roadmap: cached.steps,
          isFallback: false 
        });
      }

      if (cached && cached.goal === goal && cached.isFallback) {
        console.log(`[AIController] Cached roadmap for "${goal}" is a fallback. Attempting fresh generation...`);
      }

      console.log(`[AIController] Cache invalid or missing. Generating fresh dynamic roadmap...`);

      // 2.5 Fetch user skills to enrich context
      const userSkills = await SkillService.getUserSkills(userId);
      const userWithSkills = { ...user, skills: userSkills.map(s => s.name) };

      // 3. Generate fresh roadmap
      const { steps, isFallback } = await AIService.generateLearningPath(userWithSkills, goal);
      
      const roadmapOutput = {
        goal: goal,
        steps: steps,
        isFallback: isFallback,
        generated_at: new Date().toISOString()
      };

      // 4. Update Cache in Database (Non-blocking)
      AuthService.updateProfile(userId, {
        cached_roadmap: roadmapOutput,
        roadmap_updated_at: roadmapOutput.generated_at
      }).catch(err => console.warn('[AIController] Roadmap cache save failed:', err.message));

      res.status(200).json({ success: true, roadmap: steps, isFallback });
    } catch (error) {
      console.error('[AIController] Learning Path Error:', error.message);
      next(error);
    }
  }
}

export default AIController;
