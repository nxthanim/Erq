const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// NVIDIA API key with fallback chain
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_1 || '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';

// Three models with fallback chain
// z-ai/glm-5.2 is primary (confirmed working with streaming + reasoning)
// Falls back to meta/llama-3.1-70b-instruct, then meta/llama-3.1-8b-instruct
const models = [
  {
    name: "z-ai/glm-5.2",
    key: NVIDIA_KEY,
    getPayload: (messages, streamMode) => ({
      model: "z-ai/glm-5.2",
      messages,
      max_tokens: 16384,
      temperature: 1,
      top_p: 1,
      seed: 42,
      stream: !!streamMode
    }),
    timeout: 30000
  },
  {
    name: "meta/llama-3.1-70b-instruct",
    key: NVIDIA_KEY,
    getPayload: (messages, streamMode) => ({
      model: "meta/llama-3.1-70b-instruct",
      messages,
      max_tokens: 16384,
      temperature: 0.7,
      top_p: 0.95,
      stream: !!streamMode
    }),
    timeout: 30000
  },
  {
    name: "meta/llama-3.1-8b-instruct",
    key: NVIDIA_KEY,
    getPayload: (messages, streamMode) => ({
      model: "meta/llama-3.1-8b-instruct",
      messages,
      max_tokens: 16384,
      temperature: 0.7,
      top_p: 0.95,
      stream: !!streamMode
    }),
    timeout: 20000
  }
];

// Helper: call NVIDIA API with fallback through all 3 models
async function callNvidia(messages, systemPrompt, streamMode) {
  const fullMessages = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  let lastError = null;

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    try {
      console.log(`🤖 AI attempt ${attempt + 1}/3: using ${model.name}`);

      const payload = model.getPayload(fullMessages, streamMode);

      // Create abort controller with per-model timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), model.timeout || 20000);

      const response = await fetch(INVOKE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.key}`,
          'Content-Type': 'application/json',
          'Accept': streamMode ? 'text/event-stream' : 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const status = response.status;
        if (status === 429 || status >= 500 || status === 403) {
          console.warn(`⚠️ Model ${model.name} returned ${status}, trying next...`);
          lastError = new Error(`Status ${status}: ${errText}`);
          continue;
        }
        throw new Error(`Status ${status}: ${errText}`);
      }

      return { response, modelName: model.name };

    } catch (err) {
      lastError = err;
      if (attempt < models.length - 1) {
        console.warn(`⚠️ Model ${model.name} failed: ${err.message}. Falling back...`);
      }
    }
  }

  throw lastError || new Error('All 3 AI models exhausted');
}

// POST /api/ai/chat - Stream AI response with triple fallback (or specific model)
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { messages, systemPrompt, modelIndex } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // If modelIndex is provided, use only that model (skip fallback loop)
    if (typeof modelIndex === 'number' && modelIndex >= 0 && modelIndex < models.length) {
      const selectedModel = models[modelIndex];
      const payload = selectedModel.getPayload(
        [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages.map(m => ({ role: m.role || 'user', content: m.content }))
        ],
        true
      );

      const controller = new AbortController();
      const modelTimeout = selectedModel.timeout || 20000;
      const timeoutId = setTimeout(() => controller.abort(), modelTimeout);

      const response = await fetch(INVOKE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${selectedModel.key}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Status ${response.status}: ${errText}`);
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices.length > 0) {
                const delta = parsed.choices[0].delta;
                if (delta?.reasoning_content) {
                  res.write(`data: ${JSON.stringify({ type: 'reasoning', content: delta.reasoning_content })}\n\n`);
                }
                if (delta?.content) {
                  res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
                }
              }
            } catch {}
          }
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Default: fallback through all models
    const { response } = await callNvidia(
      messages.map(m => ({ role: m.role || 'user', content: m.content })),
      systemPrompt,
      true
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices.length > 0) {
              const delta = parsed.choices[0].delta;
              if (delta?.reasoning_content) {
                res.write(`data: ${JSON.stringify({ type: 'reasoning', content: delta.reasoning_content })}\n\n`);
              }
              if (delta?.content) {
                res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
              }
            }
          } catch { /* skip parse errors */ }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (err) {
    console.error('AI chat error:', err);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'All 3 AI services are currently unavailable. Please try again later.' })}\n\n`);
      res.end();
    }
  }
});

// POST /api/ai/generate-gig - Generate a gig description (non-streaming with triple fallback)
router.post('/generate-gig', authenticate, async (req, res) => {
  try {
    const { topic, category, tone } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const systemPrompt = `You are an AI assistant for Gebeya, an Ethiopian freelance marketplace. 
Generate professional, compelling gig/service listings. Use Ethiopian Birr (ETB) for pricing.
Keep descriptions clear, professional, and attractive to Ethiopian clients.
Respond with valid JSON only in this exact format: { "title": "...", "description": "...", "price_range": "ETB X - Y", "delivery_time": "X days", "tags": ["tag1","tag2","tag3","tag4","tag5"] }
No markdown, no extra text, just the JSON object.`;

    const result = await callNvidia(
      [{
        role: 'user',
        content: `Create a gig listing for: "${topic}"\nCategory: ${category || 'General'}\nTone: ${tone || 'professional'}`
      }],
      systemPrompt,
      false
    );
    
    const responseData = result.response;
    const responseJson = await responseData.json();
    let content = result.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const gigData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      res.json({ success: true, gig: gigData });
    } catch {
      res.json({ success: true, gig: { raw: content } });
    }

  } catch (err) {
    console.error('Gig generation error:', err);
    res.status(500).json({ error: 'AI generation error: ' + err.message });
  }
});

// ====== AI RECOMMENDATIONS ======
// GET /api/ai/recommendations - Get AI-powered gig/job recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const { type = 'gigs', limit = 6, category, skills } = req.query;
    const db = require('../config/db');

    let recommendations = [];

    if (type === 'gigs') {
      // Get gigs based on user's skills (if freelancer) or category (if client)
      const userSkills = skills || req.user.skills || '';
      const skillList = userSkills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      // Get recent/popular gigs
      const queryLimit = parseInt(limit) || 6;
      const params = category ? [category, queryLimit] : [queryLimit];
      const gigs = await db.prepare(`
        SELECT g.*, u.full_name as freelancer_name, u.rating as freelancer_rating,
        u.profile_picture as freelancer_picture, u.city as freelancer_city
        FROM gigs g JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
        ${category ? 'AND g.category = ?' : ''}
        ORDER BY g.created_at DESC
        LIMIT ?
      `).all(...params);

      recommendations = gigs.filter(g => {
        if (skillList.length === 0) return true;
        const gigTitle = (g.title || '').toLowerCase();
        const gigDesc = (g.description || '').toLowerCase();
        const gigCat = (g.category || '').toLowerCase();
        return skillList.some(skill =>
          gigTitle.includes(skill) || gigDesc.includes(skill) || gigCat.includes(skill)
        );
      });

      // If not enough matches, add trending gigs
      if (recommendations.length < 3) {
        const trending = await db.prepare(`
          SELECT g.*, u.full_name as freelancer_name, u.rating as freelancer_rating,
          u.profile_picture as freelancer_picture, u.city as freelancer_city
          FROM gigs g JOIN users u ON g.freelancer_id = u.id
          WHERE g.active = 1
          ORDER BY g.view_count DESC
          LIMIT 6
        `).all();

        const existingIds = new Set(recommendations.map(r => r.id));
        for (const gig of trending) {
          if (!existingIds.has(gig.id) && recommendations.length < parseInt(limit)) {
            recommendations.push(gig);
            existingIds.add(gig.id);
          }
        }
      }
    } else if (type === 'freelancers') {
      // Recommend freelancers based on category match
      recommendations = await db.prepare(`
        SELECT u.id, u.full_name, u.role, u.city, u.bio, u.skills, u.rating,
        u.review_count, u.profile_picture, u.verified
        FROM users u
        WHERE u.role = 'freelancer' AND u.verified = 1
        ${category ? `AND (u.skills LIKE ? OR u.city LIKE ?)` : ''}
        ORDER BY u.rating DESC, u.review_count DESC
        LIMIT ?
      `).all(...(category ? [`%${category}%`, `%${category}%`, parseInt(limit) || 6] : [parseInt(limit) || 6]));
    }

    res.json({ success: true, recommendations, type });
  } catch (err) {
    console.error('AI recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// POST /api/ai/smart-match - Smart matching between jobs and freelancers
router.post('/smart-match', authenticate, async (req, res) => {
  try {
    const { jobId, maxResults = 5 } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const db = require('../config/db');

    // Get the job
    const job = await db.prepare('SELECT * FROM jobs WHERE id = $1').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Extract keywords from job title and description
    const jobText = `${job.title} ${job.description} ${job.category || ''}`.toLowerCase();
    const keywords = jobText
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','has','have','been','some','them','than','what','when','which','will','with','their','this','that','from','they','been','have','more','about','into','over','after','also','other','such','than','then','very','just','come','like','make','much','new','only','very','well'].includes(w));

    // Find freelancers with matching skills
    const freelancers = await db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM gigs g WHERE g.freelancer_id = u.id AND g.active = 1) as active_gigs,
        (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = u.id) as total_reviews
      FROM users u
      WHERE u.role = 'freelancer'
      ORDER BY u.rating DESC
      LIMIT 50
    `).all();

    // Score each freelancer based on skill match
    const scored = freelancers.map(freelancer => {
      const freelancerText = `${freelancer.skills || ''} ${freelancer.bio || ''} ${freelancer.city || ''}`.toLowerCase();
      let score = 0;

      // Keyword match score
      for (const keyword of keywords) {
        if (freelancerText.includes(keyword)) {
          score += 2;
        }
      }

      // Category match
      if (job.category && freelancerText.includes(job.category.toLowerCase())) {
        score += 5;
      }

      // Rating bonus
      score += (freelancer.rating || 0) * 2;

      // Verified bonus
      if (freelancer.verified) score += 3;

      return { ...freelancer, matchScore: score };
    });

    // Sort by score and return top matches
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const matches = scored.slice(0, maxResults);

    // Remove password from results
    const safeMatches = matches.map(({ password, ...rest }) => rest);

    res.json({ success: true, job, matches: safeMatches });
  } catch (err) {
    console.error('Smart match error:', err);
    res.status(500).json({ error: 'Failed to match freelancers' });
  }
});

// ====== NVIDIA FLUX IMAGE-TO-IMAGE GENERATION ======
// POST /api/ai/generate-image - Edit an image using NVIDIA FLUX.1-kontext-dev
// NOTE: This is an img2img model - it REQUIRES a base64 image to work.
// Supported params: prompt (required), image (required), seed (optional), steps (optional)
// NOT supported by this model: aspect_ratio, cfg_scale
router.post('/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, image, steps, seed } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!image) {
      return res.status(400).json({
        error: 'A reference image is required. This model (FLUX.1-kontext-dev) edits existing images. Please upload an image first.',
      });
    }

    const INVOKE_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev";
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_IMAGE || "";

    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }

    const parsedSeed = seed !== undefined && seed !== null ? parseInt(seed) : Math.floor(Math.random() * 1000000);

    const payload = {
      prompt,
      image,
      aspect_ratio: 'match_input_image',
      cfg_scale: 3.5,
      seed: isNaN(parsedSeed) ? Math.floor(Math.random() * 1000000) : parsedSeed,
      steps: parseInt(steps) || 30,
    };

    console.log(`🖼️ Editing FLUX image with prompt: "${prompt.substring(0, 80)}..."`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(INVOKE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('FLUX API error:', response.status, errText);
      return res.status(response.status).json({
        error: `Image editing failed: ${response.statusText}`,
        details: errText,
      });
    }

    const result = await response.json();

    // FLUX.1-kontext-dev returns the result in artifacts[0].base64
    let imageData = null;
    if (result.artifacts && result.artifacts.length > 0 && result.artifacts[0].base64) {
      imageData = result.artifacts[0].base64;
    } else if (result.image) {
      imageData = result.image;
    }

    if (!imageData) {
      return res.status(500).json({ error: 'No image data in response', raw: result });
    }

    res.json({
      success: true,
      image: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`,
      seed: payload.seed,
      prompt,
    });

  } catch (err) {
    console.error('Image generation error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Image generation timed out after 120 seconds' });
    }
    res.status(500).json({ error: 'Image editing failed: ' + err.message });
  }
});

// ====== NVIDIA FLUX TEXT-TO-IMAGE GENERATION ======
// POST /api/ai/generate-image-txt2img - Generate an image from text using FLUX-schnell
// This is a text-to-image model — no input image needed.
// Supported params: prompt (required), aspectRatio, steps, cfgScale, seed
router.post('/generate-image-txt2img', authenticate, async (req, res) => {
  try {
    const { prompt, aspectRatio, steps, cfgScale, seed } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const INVOKE_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_IMAGE || "";

    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }

    const parsedSeed = seed !== undefined && seed !== null ? parseInt(seed) : Math.floor(Math.random() * 1000000);

    // FLUX-schnell accepts: prompt, aspect_ratio, steps, cfg_scale, seed
    const payload = {
      prompt,
      aspect_ratio: aspectRatio || "16:9",
      steps: parseInt(steps) || 4,
      cfg_scale: parseFloat(cfgScale) || 1.0,
      seed: isNaN(parsedSeed) ? Math.floor(Math.random() * 1000000) : parsedSeed,
    };

    console.log(`🖼️ Generating FLUX image from text: "${prompt.substring(0, 80)}..."`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(INVOKE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('FLUX txt2img API error:', response.status, errText);
      return res.status(response.status).json({
        error: `Image generation failed: ${response.statusText}`,
        details: errText,
      });
    }

    const result = await response.json();

    // FLUX-schnell returns result in artifacts[0].base64
    let imageData = null;
    if (result.artifacts && result.artifacts.length > 0 && result.artifacts[0].base64) {
      imageData = result.artifacts[0].base64;
    } else if (result.image) {
      imageData = result.image;
    }

    if (!imageData) {
      return res.status(500).json({ error: 'No image data in response', raw: result });
    }

    res.json({
      success: true,
      image: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`,
      seed: payload.seed,
      prompt,
      model: 'flux-schnell',
    });

  } catch (err) {
    console.error('Image generation error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Image generation timed out after 120 seconds' });
    }
    res.status(500).json({ error: 'Image generation failed: ' + err.message });
  }
});

// ====== AI WEBSITE GENERATOR ======
// POST /api/ai/generate-website - Generate a complete website (HTML/CSS/JS) based on description
router.post('/generate-website', authenticate, async (req, res) => {
  try {
    const { description, pages, style, sections } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const systemPrompt = `You are an expert web developer AI. Generate a complete, production-ready single-page website in HTML with embedded CSS and JavaScript.

Requirements:
- Return ONLY valid JSON with no markdown, no extra text
- Use modern CSS (Flexbox, Grid, CSS variables, smooth animations)
- Make it responsive with a mobile-first approach
- Use a clean, professional design
- Include smooth scroll, hover effects, and micro-interactions
- Use Font Awesome icons (via CDN: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css)
- Use Google Fonts (Inter or Poppins)

Response format (JSON only):
{
  "title": "Website Title",
  "html": "<complete HTML string with embedded CSS in <style> and JS in <script>>",
  "sections": ["hero", "features", "about", "contact", "footer"],
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "fonts": ["font-name"]
}`;

    const userPrompt = `Create a ${style || 'modern and professional'} website for: "${description}"
${pages ? `Include these sections: ${pages}` : 'Include: hero, features, about, contact, footer sections'}
Style preference: ${style || 'modern, clean, professional'}`;

    const result = await callNvidia(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      false
    );
    
    const responseData = result.response;
    const responseJson = await responseData.json();
    let content = '';
    
    if (responseJson.choices && responseJson.choices[0] && responseJson.choices[0].message) {
      content = responseJson.choices[0].message.content;
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const websiteData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      res.json({ success: true, website: websiteData });
    } catch {
      // If JSON parsing fails, return raw content
      res.json({ 
        success: true, 
        website: { 
          title: description.substring(0, 50),
          html: content, 
          sections: ['generated'],
          colorPalette: { primary: '#2563eb', secondary: '#1e40af', accent: '#f59e0b', background: '#ffffff', text: '#1f2937' },
          fonts: ['Inter']
        } 
      });
    }

  } catch (err) {
    console.error('Website generation error:', err);
    res.status(500).json({ error: 'Website generation error: ' + err.message });
  }
});

module.exports = router;
