const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      timeout: 15000, // 15 second timeout — fail fast, don't hang
      maxRetries: 0,  // No retries — we handle fallback ourselves
    });
  }
  return _client;
}

const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

/**
 * Build a system instruction prompt from an agent's configuration.
 */
function buildSystemPrompt(agent) {
  const name = agent.name || 'Assistant';
  const role = agent.role || 'assistant';
  const instructions = agent.instructions || '';

  const roleDescriptions = {
    'General Assistant': 'A helpful, friendly AI assistant for the Erq marketplace.',
    'Content Creator': 'An expert content creator specializing in writing gig descriptions, proposals, blog posts, social media content, and marketing copy.',
    'Design Consultant': 'An expert design consultant specializing in graphic design, branding, visual aesthetics, UI/UX, and portfolio presentation.',
    'Analytics Expert': 'A data-savvy analyst who helps users understand marketplace data, performance metrics, and business insights.',
    'Customer Support': 'A patient, helpful support agent who assists users with navigating the Erq platform, resolving issues, and answering questions.',
    'Sales Agent': 'A persuasive sales specialist who helps close deals, write compelling pitches, and negotiate effectively.',
    'Custom': instructions ? `A custom AI assistant with the following instructions: ${instructions}` : 'A versatile AI assistant ready to help with any task.',
  };

  const roleDescription = roleDescriptions[role] || roleDescriptions['General Assistant'];

  return `You are ${name}, an AI agent on Erq — Ethiopia's #1 freelance marketplace.

${roleDescription}

${instructions ? `## Your Special Instructions\n${instructions}\n` : ''}

## About Erq Marketplace
Erq connects Ethiopian freelancers with clients. It features:
- **Categories:** Translation (Amharic, English, Afan Oromo, Tigrinya), Graphic Design, Video Editing, Web Development, Virtual Assistant, Social Media Management, AI Services, Consulting, Data
- **Payments:** Secure TeleBirr escrow — funds held until work is approved
- **For Freelancers:** Create gigs, bid on jobs, build portfolio, get verified, earn badges
- **For Clients:** Post jobs, browse freelancers, award projects, pay via escrow, leave reviews
- **Features:** Real-time messaging, AI Agents & Subagents, Live Activity Feed, AI Website Builder, Store Builder, Analytics Dashboard, Business Dashboard (CRM, Meetings, Invoicing, Video Calls), Dispute Resolution, Referral System, Multi-language (English & Amharic)

## Guidelines
- Be helpful, friendly, and professional
- Use Ethiopian context and examples when relevant
- Keep responses concise but informative
- Use markdown formatting (bold, bullet points, emojis) to make responses readable
- If asked something outside your expertise, be honest and suggest finding someone who can help
- If the user asks about TeleBirr, escrow, or payments — explain the escrow system clearly
- If the user asks about creating agents or subagents — explain the agents feature

## Response Format
- Use **bold** for emphasis
- Use bullet points for lists
- Use emojis where appropriate 🇪🇹
- Keep paragraphs short and scannable`;
}

/**
 * Send a message to the AI model and get a response with conversation history.
 * Uses NVIDIA's API (OpenAI-compatible) with the configured API key.
 *
 * @param {string} userMessage - The user's message
 * @param {object} agent - The agent object (name, role, instructions)
 * @param {Array} history - Array of { role: 'user'|'agent', content: string } from DB
 * @param {object} options - { model?: string }
 * @returns {Promise<string>} The AI response text
 */
async function getAIResponse(userMessage, agent, history = [], options = {}) {
  const modelName = options.model || DEFAULT_MODEL;
  const FALLBACK_MODEL = 'meta/llama-3.1-70b-instruct';

  // If no API key, throw a clear error
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY_NOT_CONFIGURED');
  }

  // Try primary model first, fall back to a known-working model if it fails
  const modelsToTry = [
    { model: modelName, label: modelName },
    { model: FALLBACK_MODEL, label: FALLBACK_MODEL },
  ];

  let lastError = null;

  for (const { model, label } of modelsToTry) {
    try {
      const messages = [];

      // System prompt
      messages.push({ role: 'system', content: buildSystemPrompt(agent) });

      // Conversation history
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'agent') {
          messages.push({
            role: msg.role === 'agent' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }

      // Current user message
      messages.push({ role: 'user', content: userMessage });

      const completion = await getClient().chat.completions.create({
        model: model,
        messages,
        max_tokens: 16384,
        temperature: 1,
        top_p: 1,
        seed: 42,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Model ${label} failed: ${err.message}. Trying fallback...`);
    }
  }

  throw lastError || new Error('All AI models exhausted');
}

module.exports = { getAIResponse, buildSystemPrompt };
