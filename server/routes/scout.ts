import type { Express } from 'express';
import { matchRankingsSchema, newsItemsSchema, parseAIJson } from '../../lib/aiSchemas';
import { computeLocalMatchRankings } from '../../lib/scoring';
import { authenticateUser, isAdminRole, newsSelectFields } from '../middleware/auth';
import { throttleLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { aiMatchRequestSchema, aiScoutSyncRequestSchema } from '../../lib/requestSchemas';
import { GLOBAL_ACCREDITED, UG_SOURCES, generateWithProviders, recordAiDecision } from '../services/aiGateway';
import { AiProvenancePersistenceError } from '../../lib/aiProvenance';
import { newsDedupeKey } from '../newsCuration';

export const registerScoutRoutes = (app: Express) => {
  app.post('/api/ai-scout/sync', validateBody(aiScoutSyncRequestSchema), authenticateUser, throttleLimit(5, 60 * 1000), async (req, res) => {
    const { force } = req.body;
  
    // Restrict forced scout sync to admin only
    if (force && !isAdminRole((req as any).userRole)) {
      return res.status(403).json({
        didUpdate: false,
        error: 'Forbidden: Forced synchronization is restricted to Admins only.'
      });
    }
  
    const today = new Date().toISOString().split('T')[0];
  
    // Collapse concurrent duplicate syncs (StrictMode double-mount + News page both trigger)
    const scoutState = (global as any).__scoutSync || ((global as any).__scoutSync = { running: false, lastDone: 0 });
    if (scoutState.running) {
      console.log('[scout] ⏳ sync already in flight — collapsing duplicate request');
      return res.json({ didUpdate: false, message: 'Sync already in progress.' });
    }
    scoutState.running = true;
  
    try {
      const supabaseServer = getServiceClient();
      if (!supabaseServer) return res.status(503).json({ didUpdate: false, error: serviceClientConfigError() });
      const finalizedItems: any[] = [];
  
      try {
        console.log(`[scout] ▶ starting news scout (force=${!!force}, last run ${scoutState.lastDone ? Math.round((Date.now() - scoutState.lastDone) / 1000) + 's ago' : 'never'})...`);
  
        const sitesPrompt = UG_SOURCES.join(", ");
        const globalPrompt = GLOBAL_ACCREDITED.join(", ");
  
        const scoutingPrompt = `Act as a Lead Intelligence Scout for the University of Ghana.
  Find 4 RECENT breakthroughs in Medicines, Vaccines, or Diagnostics.
  
  For each news item, you MUST analyze and extract:
  - title: clear, academic-grade title of the breakthrough.
  - category: one of 'Announcement', 'Grant Opportunity', 'Strategic Partnership', 'Research Release', 'Ecosystem Updates'.
  - summary: highly detailed professional science journalism summary.
  - tags: array of 3-5 relevant semantic keywords or research topics.
  - relevance_score: integer score from 1 to 100 indicating relevance to UG's medical/biotech research ecosystem.
  - source_verification_notes: notes on credibility, peer review status, or institutional verification.
  - source_name: name of the publishing institution or journal.
  - external_url: direct link to source publications.
  
  Sources: ${sitesPrompt}
  Global context: ${globalPrompt}
  
  Output: JSON array of objects with the precise structure outlined.`;
  
        const providerOutput = await generateWithProviders(scoutingPrompt, { json: true });
        if (!providerOutput?.text) {
          throw new Error("Ecosystem services currently busy. Bypassing live sync to fallback.");
        }
  
        const rawScoutedData = parseAIJson(newsItemsSchema, providerOutput.text.trim());
  
        for (let i = 0; i < Math.min(rawScoutedData.length, 4); i++) {
          const item = rawScoutedData[i];
          finalizedItems.push({
            title: item.title,
            category: item.category,
            published_at: today,
            image_url: '', // Empty initially for manual review and image upload!
            summary: item.summary,
            tags: item.tags || [],
            relevance_score: item.relevance_score || 0,
            source_verification_notes: item.source_verification_notes || '',
            external_url: item.external_url || '',
            is_ai_generated: true,
            source_name: item.source_name || 'Global News Feed',
            status: 'Draft' // Saved as Draft so admin must upload image and review before publishing
          });
        }
  
        await recordAiDecision({
          decision_type: 'news_scouting',
          subject_id: null,
          provider: providerOutput.provider,
          model: providerOutput.model,
          prompt_version: 'ugjh-news-scout-v1',
          result: { scouted_items: finalizedItems.length }
        });
      } catch (scoutError: any) {
        if (scoutError instanceof AiProvenancePersistenceError) throw scoutError;
        console.log(`Live AI News Sync temporarily unavailable (${scoutError?.message || scoutError}); no fallback items will be inserted.`);
      }

      if (finalizedItems.length === 0) {
        console.log('[scout] no provider output — returning without inserting fallback items.');
        scoutState.lastDone = Date.now();
        return res.json({ didUpdate: false, message: 'No items synchronized.', reason: 'provider_unavailable' });
      }
  
      // Add internal commercialization projects if any
      try {
        const { data: projectsData } = await supabaseServer
          .from('projects')
          .select('*')
          .in('status', ['Commercialization-Ready', 'Market-Ready']);
  
        if (projectsData && projectsData.length > 0) {
          projectsData.forEach((p: any) => {
            finalizedItems.push({
              title: `UG Milestone: ${p.title} Ready for Adoption`,
              category: 'Ecosystem Updates',
              published_at: p.start_date || today,
              image_url: p.image_url?.split('|')[0] || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
              summary: `University of Ghana announces that the ${p.research_area || 'research focus'} innovation from ${p.department || 'the University'} has been commercially validated and is ready for licensing.`,
              external_url: `#/projects/${p.id}`,
              is_ai_generated: false,
              source_name: 'UG Industry Hub',
              status: 'Draft'
            });
          });
        }
      } catch (dbErr) {
        console.warn("Milestone news aggregation failed:", dbErr);
      }
  
      if (finalizedItems.length > 0) {
        try {
          const { data: existingRows } = await supabaseServer.from('news').select(newsSelectFields).limit(500);
          let insertCount = 0;
          for (const item of finalizedItems) {
            const incomingKey = newsDedupeKey(item);
            const existing = (existingRows || []).find((row: any) => {
              const rowKey = newsDedupeKey(row);
              return (incomingKey.url && rowKey.url === incomingKey.url) || rowKey.content === incomingKey.content;
            });
            if (existing) continue;
            const { error: insertError } = await supabaseServer.from('news').insert(item);
            if (!insertError) insertCount++;
          }
          console.log(`[scout] ✔ added ${insertCount}/${finalizedItems.length} news items (deduplicated)`);
          scoutState.lastDone = Date.now();
          return res.json({ didUpdate: insertCount > 0, count: insertCount });
        } catch (upsertErr: any) {
          console.warn("Server News: deduplicated inserts failed:", upsertErr?.message || upsertErr);
          return res.status(500).json({ didUpdate: false, error: 'News synchronization failed.' });
        }
      }
  
      console.log('[scout] = finished — 0 new items (feeds up to date)');
      scoutState.lastDone = Date.now();
      res.json({ didUpdate: false, message: 'No items synchronized.' });
    } catch (error: any) {
      console.error('[scout] ✖ sync failed:', error.message);
      console.warn('AI Scout sync issue:', error.message);
        res.json({ didUpdate: false, error: 'Sync encountered an issue and will retry automatically.' });
    } finally {
      scoutState.running = false;
    }
  });
  
  // 6. Secure AI Candidate Match ranking proxy

  app.post('/api/ai-match', validateBody(aiMatchRequestSchema), authenticateUser, throttleLimit(20, 60 * 1000), async (req, res) => {
    const { userProfile, candidateMatches } = req.body || {};
    const up = userProfile || {};
    const candidates = candidateMatches || [];
  
    if (!candidates || !candidates.length) {
      return res.json({ rankings: [] });
    }
  
    const computeLocalRankings = () => computeLocalMatchRankings(up, candidates);
  
    const prompt = `
        You are an elite AI Matching Engine for the University of Ghana Research Hub.
        Your task is to re-rank potential matches based on specific weighted factors.
  
        MATCHING CRITERIA & WEIGHTS:
        1. Skills Overlap (25%): technical and research competencies.
        2. Intent Compatibility (25%): what they are looking for vs what they offer.
        3. Interests Similarity (20%): research domains and industries.
        4. Project/Industry Alignment (20%): sectors and current initiatives.
        5. Logistics (10%): location and collaboration preferences.
  
        USER PROFILE:
        - Role: ${up.professional_profile?.current_role || ''}
        - Title: ${up.professional_profile?.professional_title || ''}
        - Summary: ${up.semantic_summary || ''}
        - Looking For: ${(up.collaboration_profile?.looking_for || []).join(', ')}
        - Can Offer: ${(up.collaboration_profile?.can_offer || []).join(', ')}
        - Technical Skills: ${(up.skills?.technical_skills || []).join(', ')}
        - Research Interests: ${(up.research_information?.research_interests || []).join(', ')}
  
        CANDIDATE MATCHES:
        ${candidates.map((c: any, i: number) => `
        [Match #${i}]
        - Unique UUID: ${c.id}
        - Type: ${c.role || (c.title ? 'Project' : 'Unknown')}
        - Title/Name: ${c.name || c.title}
        - Role: ${c.role || 'Project/Initiative'}
        - Summary: ${c.semantic_summary || c.description}
        - Similarity Score: ${c.similarity}
        `).join('\n')}
  
        INSTRUCTIONS:
        1. Normalize all scores to a 0-100 scale.
        2. For every match provided, give an objective assessment.
        3. For each match, provide:
           - A "reasoning" (2 sentences) explaining the strategic fit based on the weights.
           - A "score" (number between 0 and 100).
           - An "alignment_label" (e.g., "Highly Compatible", "Strategic Match", "Potential Overlay").
        
        OUTPUT FORMAT:
        Return a JSON object with a "rankings" array containing objects exactly like this:
        {
          "id": "match_uuid_from_above",
          "index": original_index_number,
          "score": number,
          "reasoning": "reasoning string",
          "alignment_label": "alignment label"
        }
      `;
  
    try {
      // Deterministic scores are authoritative; the LLM only supplies explanation text.
      const localRankings = computeLocalRankings();
  
      let llmRankings: any[] | null = null;
      let provider: string | null = null;
      let model: string | null = null;
  
      const providerOutput = await generateWithProviders(prompt, {
        json: true,
        system: 'You are a professional research matching AI. Respond strictly in JSON format matching the specified schema.'
      });
      if (providerOutput) {
        llmRankings = parseAIJson(matchRankingsSchema, providerOutput.text.trim()).rankings;
        provider = providerOutput.provider;
        model = providerOutput.model;
      }
  
      // Merge: keep the deterministic score, use LLM reasoning/label only when present.
      const finalRankings = localRankings.map((lr: any) => {
        const llm = (llmRankings || []).find((r: any) =>
          (r.id && lr.id && String(r.id).toLowerCase() === String(lr.id).toLowerCase()) ||
          (r.index !== undefined && Number(r.index) === lr.index)
        );
        return {
          id: lr.id,
          index: lr.index,
          score: lr.score,
          reasoning: llm?.reasoning || lr.reasoning,
          alignment_label: llm?.alignment_label || lr.alignment_label,
        };
      });
  
      await recordAiDecision({
        decision_type: 'match_ranking',
        subject_id: (req as any).user?.id || null,
        provider: provider || 'hybrid',
        model: model || 'scoring-engine',
        prompt_version: 'ugjh-match-rankings-v1',
        result: { rankings_count: finalRankings.length, llm_enriched: llmRankings ? true : false }
      });
  
      return res.json({ rankings: finalRankings });
    } catch (error: any) {
      console.error('AI match ranking exception, returning calculated local rankings:', error);
      return res.json({ rankings: computeLocalRankings() });
    }
  });
  
  
  // --- 7. INDUSTRY CHALLENGES & CHALLENGE MATCHING ENDPOINTS ---
  
  // GET /api/industry-challenges - List all industry challenges
};
