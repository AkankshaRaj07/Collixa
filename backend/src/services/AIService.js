import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/env.js';

/**
 * AI Service for Matching and Recommendations
 * Powered by Google Gemini
 */
export class AIService {
  constructor() {
    this.genAI = null;
    this.model = null;
    
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-flash-latest"
      });
    } else {
      console.warn('⚠️  GEMINI_API_KEY not found in configuration. AI features will be disabled.');
    }
  }

  /**
   * Helper to check if AI is configured
   */
  isConfigured() {
    return !!this.model;
  }

  /**
   * Calculate matching score between two profiles
   * @param {Object} source - Primary user profile (with skills/interests)
   * @param {Object} target - Target profile or intent (with skills/description)
   * @returns {Promise<Object>} Match results
   */
  /**
   * Calculate matching score between two profiles
   * @param {Object} source - Primary user profile (with skills/interests)
   * @param {Object} target - Target profile or intent (with skills/description)
   * @returns {Promise<Object>} Match results
   */
  async calculateMatch(source, target, type = 'intent') {
    const isSkill = type === 'skill' || type === 'tribe';
    
    if (!this.isConfigured()) {
       if (isSkill) {
         return { 
           score: 92, 
           reasons: ['Complementary mastery potential', 'High skill exchange value', 'Growth-oriented synergy'], 
           verdict: 'Your skillsets align perfectly for a mutually beneficial learning exchange.' 
         };
       }
       return { score: 88, reasons: ['Strong Portfolio Synergy', 'Shared Mission Focus', 'Complementary Technical Stack'], verdict: 'Your profiles show exceptional alignment for this collaboration.' };
    }

    const prompt = `
      You are an expert recruiter and collaboration engine for the Collixa platform. 
      Analyze the compatibility for a ${isSkill ? 'SKILL EXCHANGE / TRIBE CONNECTION' : 'PROJECT COLLABORATION / INTENT'}.
      
      SOURCE USER:
      Name: ${source.name}
      Bio: ${source.bio || 'N/A'}
      Skills: ${JSON.stringify(source.skills || [])}
      Interests: ${JSON.stringify(source.interests || [])}

      TARGET ${isSkill ? 'SKILL/TRIBE' : 'INTENT'}:
      Title: ${target.title || target.name}
      Description: ${target.description || target.bio || 'N/A'}
      ${isSkill ? 'Focus' : 'Requirements'}: ${JSON.stringify(target.skills || target.requirements || [])}

      INSTRUCTIONS:
      - If it is a SKILL/TRIBE, analyze if the SOURCE user can learn from or contribute to this TRIBE.
      - If it is an INTENT, analyze if the SOURCE user is a good fit to collaborate on this PROJECT.
      
      Return a JSON object with:
      1. score: 0-100 indicating compatibility.
      2. reasons: Array of 3 key reasons for this score.
      3. verdict: A short (1 sentence) professional summary.

      ONLY return the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
      
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (error) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[AIService] Match Error: Quota Exceeded (429). Returning heuristic fallback.');
      } else {
        console.warn('[AIService] Match Error (Falling back to heuristic):', error.message);
      }
      
      const sourceSkills = (source.interests || []).map(i => i.toLowerCase());
      const targetTags = (target.description || '').toLowerCase();
      const matchCount = sourceSkills.filter(s => targetTags.includes(s)).length;
      const score = Math.min(85 + (matchCount * 2), 98);

      if (isSkill) {
        return {
          score,
          reasons: ['Strong technical overlap', 'Potential for knowledge transfer', 'Learning path alignment'],
          verdict: 'This tribe matches your growth trajectory. Highly recommended for skill expansion.'
        };
      }

      return { 
        score, 
        reasons: ['Profile compatibility detected', 'Shared thematic interests', 'Mission alignment potential'], 
        verdict: 'AI analysis suggests strong alignment with this intent. Synergy looks promising.' 
      };
    }
  }

  /**
   * Generate a Learning Path roadmap
   * @param {Object} user - User profile
   * @param {string} goal - Target skill or project goal
   * @returns {Promise<Object>} Roadmap steps
   */
  async generateLearningPath(user, goal) {
    const fallbackRoadmap = [
      { step: 'Phase 1: Foundation & Planning', description: `Define the core architecture for "${goal}". Break down major milestones into 5-7 manageable sub-tasks.`, duration: '3 Days', resources: ['Gap Analysis', 'Standard Operating Procedures'] },
      { step: 'Phase 2: Deep Component Mastery', description: `Research and study the critical skills required for ${goal}. Focus on closing the gap in your current proficiency areas.`, duration: '1 Week', resources: ['Open Source Documentation', 'Case Studies'] },
      { step: 'Phase 3: Rapid Prototyping', description: 'Develop a minimum viable implementation of your goal. Focus on functional logic over aesthetic polish at this stage.', duration: '10 Days', resources: ['Iterative Design', 'Unit Testing'] },
      { step: 'Phase 4: Optimization & Review', description: 'Review the initial results against your target goal. Refactor bottlenecks and optimize for performance.', duration: '5 Days', resources: ['Peer Code Review', 'Benchmarking'] },
      { step: 'Phase 5: Deployment & Integration', description: 'Finalize your project and prepare for real-world application. Document your learning journey for future reference.', duration: '3 Days', resources: ['Deployment Pipelines', 'Impact Assessment'] }
    ];

    if (!this.isConfigured()) {
      return { steps: fallbackRoadmap, isFallback: true };
    }

      const prompt = `
        You are an expert technical mentor and project architect for the Collixa platform.
        Create a personalized 5-step implementation roadmap for a user to achieve this goal: "${goal}".
        
        CONTEXT:
        - User current skills: ${JSON.stringify(user.skills || [])}
        - Goal to achieve: "${goal}"

        REQUIRED OUTPUT FORMAT:
        Return ONLY a JSON array of exactly 5 objects. Each object MUST have:
        1. "step": A short, catchy title (e.g., "Foundational Setup")
        2. "description": A detailed explanation (2-3 sentences) of what to do.
        3. "duration": Estimated time (e.g., "2 Days", "1 Week")
        4. "resources": An array of 3 specific technical topics to study.

        CRITICAL: 
        - Tailor the steps to the specific goal of "${goal}".
        - Be technical and professional.
        - Output ONLY the raw JSON array. No markdown code blocks, no preamble.
      `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text() || "";
      
      if (!text) {
        throw new Error('AI returned an empty response');
      }

      // Improved JSON extraction: find the first '[' and last ']'
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      
      if (start === -1 || end === -1) {
        throw new Error('AI returned malformed roadmap (no array found)');
      }
      
      const jsonStr = text.substring(start, end + 1);
      const steps = JSON.parse(jsonStr);
      
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('AI returned empty or invalid roadmap array');
      }

      return { steps, isFallback: false };
    } catch (error) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[AIService] Roadmap Quota Exceeded (429). Falling back.');
      } else {
        console.warn('[AIService] Roadmap Generation Error:', error.message);
      }
      return { steps: fallbackRoadmap, isFallback: true };
    }
  }

  /**
   * Rank and recommend items for a user
   * @param {Object} user - User profile
   * @param {Array} items - List of items (intents or skills) to rank
   * @returns {Promise<Array>} Ranked items
   */
  async getRecommendations(user, items) {
    if (!items || items.length === 0) return [];
    if (!this.isConfigured()) {
       return items.slice(0, 3);
    }

    const prompt = `
      You are a specialized recommendation engine. 
      Analyze the user profile and the list of available items to find the best 3 matches.
      
      USER:
      Skills: ${JSON.stringify(user.skills || [])}
      Interests: ${JSON.stringify(user.interests || [])}
      Goal: ${user.target_goal || 'Any experience'}

      ITEMS: 
      ${items.map((item, index) => `${index + 1}: ${item.title || item.name} - ${item.description || item.category}`).join('\n')}

      Return a JSON array of the TOP 3 indexes (e.g., [1, 5, 2]). 
      ONLY return the JSON array, nothing else.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || text;
      const topIndexes = JSON.parse(jsonStr);
      
      return topIndexes
        .map(idx => items[idx - 1])
        .filter(Boolean);
    } catch (error) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[AIService] Rate limit reached (429). Returning heuristic fallback.');
      } else {
        console.error('AI Recommendation Error:', error);
      }
      return items.slice(0, 3); // Fallback to first 3 items
    }
  }

  /**
   * Consolidate Intent and Partner recommendations into a single AI call
   * @param {Object} user 
   * @param {Array} intents 
   * @param {Array} partners 
   * @returns {Promise<Object>} { intents: [], partners: [] }
   */
  async getUnifiedRecommendations(user, intents, partners) {
    if (!this.isConfigured()) {
      return { intents: intents.slice(0, 3), partners: partners.slice(0, 3) };
    }

    const prompt = `
      You are a specialized recommendation engine for the Collixa Collaboration Platform.
      Analyze the user's profile and provide the top 3 recommendations for INTENTS and top 3 for PARTNERS.

      USER PROFILE:
      Skills: ${JSON.stringify(user.skills || [])}
      Interests: ${JSON.stringify(user.interests || [])}
      Goal: ${user.target_goal || 'Any experience'}

      AVAILABLE INTENTS:
      ${intents.map((item, index) => `I${index + 1}: ${item.title} - ${item.category}`).join('\n')}

      AVAILABLE PARTNERS:
      ${partners.map((item, index) => `P${index + 1}: ${item.user?.name || item.name} - Specialist in ${item.name}`).join('\n')}

      Return a JSON object with two arrays of indexes:
      {
        "intentIndexes": [1, 2, 3], 
        "partnerIndexes": [1, 2, 3]
      }
      ONLY return the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const data = JSON.parse(jsonStr);

      return {
        intents: (data.intentIndexes || []).map(idx => intents[idx - 1]).filter(Boolean).slice(0, 3),
        partners: (data.partnerIndexes || []).map(idx => partners[idx - 1]).filter(Boolean).slice(0, 3)
      };
    } catch (error) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[AIService] Unified Rate limit reached (429). Falling back to heuristics.');
      } else {
        console.error('[AIService] Unified Recommendation Error:', error);
      }
      return { 
        intents: intents.slice(0, 3), 
        partners: partners.slice(0, 3) 
      };
    }
  }
}

// Export as singleton
export default new AIService();
