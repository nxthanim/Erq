"""AI routes: image generation, chat, gig generation, smart matching, recommendations."""

import json
import re
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, ilike_sql
from python_backend.auth import get_current_user
from python_backend.config import settings
from python_backend.schemas import (
    AIImageGenerateRequest, AIChatRequest, AIGigRequest,
    AIStoreGenerateRequest, SmartMatchRequest,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"
FALLBACK_MODEL = "meta/llama-3.1-70b-instruct"


def _build_system_prompt(agent: dict) -> str:
    name = agent.get("name", "Assistant")
    role = agent.get("role", "assistant")
    instructions = agent.get("instructions", "")

    role_descs = {
        "General Assistant": "A helpful, friendly AI assistant for the Erq marketplace.",
        "Content Creator": "An expert content creator specializing in writing gig descriptions, proposals, blog posts, social media content, and marketing copy.",
        "Design Consultant": "An expert design consultant specializing in graphic design, branding, visual aesthetics, UI/UX, and portfolio presentation.",
        "Analytics Expert": "A data-savvy analyst who helps users understand marketplace data, performance metrics, and business insights.",
        "Customer Support": "A patient, helpful support agent who assists users with navigating the Erq platform, resolving issues, and answering questions.",
        "Sales Agent": "A persuasive sales specialist who helps close deals, write compelling pitches, and negotiate effectively.",
    }

    role_desc = role_descs.get(role, role_descs["General Assistant"])

    return f"""You are {name}, an AI agent on Erq — Ethiopia's #1 freelance marketplace.

{role_desc}

{ f'## Your Special Instructions\n{instructions}\n' if instructions else '' }

## About Erq Marketplace
Erq connects Ethiopian freelancers with clients. It features:
- **Categories:** Translation, Graphic Design, Video Editing, Web Development, Virtual Assistant, Social Media Management, AI Services, Consulting, Data
- **Payments:** Secure TeleBirr escrow — funds held until work is approved
- **For Freelancers:** Create gigs, bid on jobs, build portfolio, get verified, earn badges
- **For Clients:** Post jobs, browse freelancers, award projects, pay via escrow, leave reviews
- **Features:** Real-time messaging, AI Agents, Live Activity Feed, AI Website Builder, Store Builder, Analytics Dashboard, Business Dashboard (CRM, Meetings, Invoicing), Dispute Resolution, Referral System

## Guidelines
- Be helpful, friendly, and professional
- Use Ethiopian context and examples when relevant
- Keep responses concise but informative
- Use markdown formatting (bold, bullet points, emojis) to make responses readable"""


async def _call_nvidia(messages: list[dict], model: str = DEFAULT_MODEL) -> str:
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(400, "NVIDIA_API_KEY not configured")

    models_to_try = [{"model": model, "label": model}, {"model": FALLBACK_MODEL, "label": FALLBACK_MODEL}]
    last_error = None

    for m in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{NVIDIA_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": m["model"],
                        "messages": messages,
                        "max_tokens": 16384,
                        "temperature": 1,
                        "top_p": 1,
                    },
                )
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            last_error = e
            print(f"[WARN] Model {m['label']} failed: {e}")

    raise HTTPException(500, f"All AI models exhausted: {last_error}")


@router.post("/chat")
async def ai_chat(req: AIChatRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.message:
        raise HTTPException(400, "Message is required")

    # Get agent config
    agent = {"name": "Erq Assistant", "role": "General Assistant", "instructions": ""}
    if req.agentId:
        agent_result = await db.execute(
            text("SELECT name, role, instructions FROM user_agents WHERE id = :id"),
            {"id": req.agentId},
        )
        a = agent_result.mappings().first()
        if a:
            agent = dict(a)

    # Build messages
    messages = [{"role": "system", "content": _build_system_prompt(agent)}]

    # Add conversation history
    if req.conversationId:
        history = await db.execute(
            text("SELECT role, content FROM agent_messages WHERE conversation_id = :cid ORDER BY created_at ASC"),
            {"cid": req.conversationId},
        )
        for h in history.mappings().all():
            messages.append({"role": "assistant" if h["role"] == "agent" else h["role"], "content": h["content"]})

    messages.append({"role": "user", "content": req.message})

    response = await _call_nvidia(messages)

    # Store in DB if conversation context
    if req.conversationId:
        await db.execute(
            text("INSERT INTO agent_messages (id, conversation_id, role, content) VALUES (:id, :cid, :role, :content)"),
            {"id": str(uuid.uuid4()), "cid": req.conversationId, "role": "user", "content": req.message},
        )
        await db.execute(
            text("INSERT INTO agent_messages (id, conversation_id, role, content) VALUES (:id, :cid, :role, :content)"),
            {"id": str(uuid.uuid4()), "cid": req.conversationId, "role": "agent", "content": response},
        )

    return {"response": response}


@router.post("/generate-image")
async def generate_image(req: AIImageGenerateRequest, user: dict = Depends(get_current_user)):
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(400, "NVIDIA_API_KEY not configured")
    if not req.prompt:
        raise HTTPException(400, "Prompt is required")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            payload = {"prompt": req.prompt}
            if req.image:
                payload["image"] = req.image

            resp = await client.post(
                f"{NVIDIA_BASE_URL}/images/generations",
                headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
            data = resp.json()
            return {"image": data}
    except Exception as e:
        raise HTTPException(500, f"Image generation failed: {e}")


@router.post("/generate-image-txt2img")
async def generate_image_txt2img(data: dict, user: dict = Depends(get_current_user)):
    """Text-to-image generation."""
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(400, "NVIDIA_API_KEY not configured")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{NVIDIA_BASE_URL}/images/generations",
                headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}", "Content-Type": "application/json"},
                json={"prompt": data.get("prompt", "")},
            )
            return {"image": resp.json()}
    except Exception as e:
        raise HTTPException(500, f"Image generation failed: {e}")


@router.post("/generate-gig")
async def generate_gig(req: AIGigRequest, user: dict = Depends(get_current_user)):
    prompt = f"""Generate a compelling gig listing for Erq Marketplace.

Title: {req.title}
Category: {req.category}
Description context: {req.description or 'N/A'}

Please generate:
1. A catchy gig title
2. A detailed service description (what's included, why choose this freelancer)
3. 3 package options (Basic, Standard, Premium) with prices, delivery times, and features
4. Relevant tags/skills

Format as JSON with keys: title, description, packages (array of {{name, price, deliveryTime, features}}), tags"""
    try:
        response = await _call_nvidia([{"role": "user", "content": prompt}])
        return {"gig": response}
    except Exception as e:
        raise HTTPException(500, f"Gig generation failed: {e}")


@router.post("/generate-website")
async def generate_website(data: dict, user: dict = Depends(get_current_user)):
    """Generate a website section plan from a natural-language description.

    Body: {"description": "...", "pages": "hero, features", "style": "..."}

    Always returns a deterministic, valid section plan (matching the client's
    SECTION_TEMPLATES keys); if NVIDIA_API_KEY is set it first asks the model,
    and falls back to the deterministic plan on any failure.
    """
    description = (data.get("description") or "").strip()
    if not description:
        raise HTTPException(400, "Description is required")

    text_lower = description.lower()

    def wants(*words):
        return any(w in text_lower for w in words)

    sections = ["hero"]
    if wants("about", "story", "who we", "team", "company"):
        sections.append("about")
    if wants("service", "offer", "product", "what we", "solution"):
        sections.append("features")
    if wants("price", "pricing", "package", "cost", "plan"):
        sections.append("pricing")
    if wants("stat", "result", "achiev", "metric", "impact"):
        sections.append("stats")
    if wants("testimonial", "review", "client say", "feedback"):
        sections.append("testimonials")
    if wants("team", "member", "staff"):
        sections.append("team")
    if wants("contact", "reach", "call", "email", "message"):
        sections.append("contact")
    if wants("action", "signup", "register", "join", "start now"):
        sections.append("cta")
    if len(sections) < 3:
        sections += ["features", "about"][: 3 - len(sections)]
    if "contact" not in sections:
        sections.append("contact")
    if "footer" not in sections:
        sections.append("footer")

    # Try the model for a nicer title/plan; never fail the request on it.
    ai_plan = None
    if settings.NVIDIA_API_KEY:
        try:
            prompt = (
                f"You are a website architect. For this site description, return STRICT JSON "
                f"with keys: title (string) and sections (array of strings, each one of: "
                f"hero, features, about, stats, testimonials, pricing, team, contact, cta, footer). "
                f"Sections must be a sensible order for the site. Description: {description}"
            )
            ai_plan = await _call_nvidia([{"role": "user", "content": prompt}], model=DEFAULT_MODEL)
        except Exception as exc:
            print(f"[WARN] generate-website AI fallback to plan: {exc}")

    title = f"{description.split('.')[0][:60]}"
    if ai_plan:
        try:
            import json as _json
            plan = _json.loads(ai_plan.strip().strip("`").strip("json").strip("```json"))
            known = {"hero", "features", "about", "stats", "testimonials", "pricing", "team", "contact", "cta", "footer"}
            ai_sections = [s for s in plan.get("sections", []) if s in known]
            if ai_sections and "hero" not in ai_sections:
                ai_sections.insert(0, "hero")
            if ai_sections and "footer" not in ai_sections:
                ai_sections.append("footer")
            if ai_sections:
                sections = ai_sections
                title = plan.get("title") or title
        except Exception:
            pass  # malformed model output -> deterministic plan

    return {"success": True, "website": {"title": title, "sections": sections}}


@router.post("/generate-store")
async def generate_store(req: AIStoreGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate an editable, brand-aware portfolio site with the saved AI key."""
    if not settings.NVIDIA_API_KEY:
        raise HTTPException(400, "NVIDIA_API_KEY is not configured on the server")
    if not req.storeName.strip() or not req.description.strip():
        raise HTTPException(400, "Portfolio name and description are required")

    prompt = f"""You are a world-class digital art director and portfolio web designer for Otr Gebeya.
Design a premium, emotionally compelling portfolio website that makes the visitor want to contact or hire this creator.
The website must feel custom-made for the brand, not like a generic template. Use strong visual hierarchy, editorial copy, precise spacing, and a coherent color system.
Return STRICT JSON only with this exact shape:
{{
  "title": "string",
  "tagline": "string",
  "description": "string",
  "ctaText": "string",
  "brand": {{"primary": "hex", "secondary": "hex", "background": "hex", "foreground": "hex", "mood": "string"}},
  "hero": {{"eyebrow": "string", "headline": "string", "subheadline": "string", "ctaText": "string"}},
  "projects": [{{"title": "string", "description": "string", "result": "string", "imageUrl": "string"}}],
  "services": [{{"title": "string", "description": "string"}}],
  "process": [{{"step": "01", "title": "string", "description": "string"}}],
  "about": {{"heading": "string", "body": "string"}},
  "contact": {{"heading": "string", "body": "string", "email": "string"}},
  "sections": ["hero", "work", "services", "process", "about", "contact", "footer"]
}}
Rules:
- This is a personal portfolio, not a fake ecommerce shop. Use project work, services, process, about, and contact sections.
- Only use projects, outcomes, links, and contact details supplied by the user. Never invent client logos, testimonials, awards, metrics, ratings, revenue, or results. Keep result empty when the user supplied no result.
- Make the first hero headline memorable and specific to the creator's real work.
- Use the requested brand colors when provided; otherwise choose a refined palette that fits the style and audience.
- Do not add a products, testimonials, reviews, or statistics section.
- The output must be deployment-ready content: concise, valid, accessible, responsive-friendly, and safe to render.

Portfolio name: {req.storeName.strip()}
Creator/business description: {req.description.strip()}
Category: {req.category or 'Not specified'}
Portfolio projects supplied by the user: {req.portfolioItems or 'None supplied'}
Services supplied by the user: {req.products or 'None supplied'}
Brand voice: {req.brandVoice or 'confident, human, premium'}
Visual direction: {req.style or 'modern, warm, trustworthy'}
Brand colors: {req.brandColors or 'Choose a suitable palette'}
Typography: body font {req.fontFamily or 'manrope'}, heading font {req.headingFont or 'playfair'}, type scale {req.typeScale or 'editorial'}, letter spacing {req.letterSpacing or 'tight'}
Contact email: {req.contactEmail or 'None supplied'}
Social links: {req.socialLinks or 'None supplied'}"""

    try:
        raw = await _call_nvidia([{"role": "system", "content": "Return valid JSON only."}, {"role": "user", "content": prompt}])
        cleaned = (raw or "").strip().removeprefix("```json").removesuffix("```").strip()
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("AI response did not contain a JSON object")
        site = json.loads(cleaned[start:end + 1])
    except Exception as exc:
        print(f"[WARN] Portfolio generation fallback: {exc}")
        site = {
            "title": req.storeName.strip(),
            "tagline": req.description.strip()[:100],
            "description": req.description.strip(),
            "ctaText": "Start a conversation",
            "brand": {"primary": "#18221f", "secondary": "#c58b32", "background": "#fbfaf7", "foreground": "#18221f", "mood": req.style or "editorial"},
            "hero": {"eyebrow": req.category or "Independent creator", "headline": req.storeName.strip(), "subheadline": req.description.strip(), "ctaText": "Start a conversation"},
            "projects": [],
            "services": [],
            "process": [],
            "about": {"heading": "About the creator", "body": req.description.strip()},
            "contact": {"heading": "Let's make something meaningful", "body": "Reach out to discuss your next project.", "email": req.contactEmail or ""},
            "sections": ["hero", "about", "contact", "footer"],
        }

    def clean_text(value, fallback=""):
        return str(value or fallback).strip()

    def clean_hex(value, fallback):
        value = clean_text(value)
        return value if re.fullmatch(r"#[0-9a-fA-F]{6}", value) else fallback

    brand = site.get("brand") if isinstance(site.get("brand"), dict) else {}
    brand = {
        "primary": clean_hex(brand.get("primary"), "#18221f"),
        "secondary": clean_hex(brand.get("secondary"), "#c58b32"),
        "background": clean_hex(brand.get("background"), "#fbfaf7"),
        "foreground": clean_hex(brand.get("foreground"), "#18221f"),
        "mood": clean_text(brand.get("mood"), req.style or "editorial"),
    }

    allowed_fonts = {"manrope", "inter", "dm-sans", "space-grotesk", "playfair", "fraunces", "instrument-serif", "lora", "plus-jakarta"}
    allowed_scales = {"compact", "editorial", "display"}
    allowed_spacing = {"tight", "balanced", "airy"}
    typography = site.get("typography") if isinstance(site.get("typography"), dict) else {}
    typography = {
        "fontFamily": clean_text(typography.get("fontFamily"), req.fontFamily or "manrope") if clean_text(typography.get("fontFamily"), req.fontFamily or "manrope") in allowed_fonts else (req.fontFamily if req.fontFamily in allowed_fonts else "manrope"),
        "headingFont": clean_text(typography.get("headingFont"), req.headingFont or "playfair") if clean_text(typography.get("headingFont"), req.headingFont or "playfair") in allowed_fonts else (req.headingFont if req.headingFont in allowed_fonts else "playfair"),
        "typeScale": clean_text(typography.get("typeScale"), req.typeScale or "editorial") if clean_text(typography.get("typeScale"), req.typeScale or "editorial") in allowed_scales else "editorial",
        "letterSpacing": clean_text(typography.get("letterSpacing"), req.letterSpacing or "tight") if clean_text(typography.get("letterSpacing"), req.letterSpacing or "tight") in allowed_spacing else "tight",
    }

    def clean_cards(value, fields):
        result = []
        for item in value or []:
            if not isinstance(item, dict):
                continue
            cleaned = {field: clean_text(item.get(field)) for field in fields}
            if cleaned.get(fields[0]):
                result.append(cleaned)
        return result[:12]

    projects = clean_cards(site.get("projects"), ["title", "description", "result", "imageUrl"])
    services = clean_cards(site.get("services"), ["title", "description"])
    process = clean_cards(site.get("process"), ["step", "title", "description"])
    sections = [section for section in (site.get("sections") or []) if section in {"hero", "work", "services", "process", "about", "contact", "footer"}]
    if projects and "work" not in sections:
        sections.insert(1 if "hero" in sections else 0, "work")
    if services and "services" not in sections:
        sections.append("services")
    if process and "process" not in sections:
        sections.append("process")
    sections = [section for section in sections if (section != "work" or projects) and (section != "services" or services) and (section != "process" or process)]
    if "hero" not in sections:
        sections.insert(0, "hero")
    if "about" not in sections:
        sections.append("about")
    if "contact" not in sections:
        sections.append("contact")
    if "footer" not in sections:
        sections.append("footer")

    hero = site.get("hero") if isinstance(site.get("hero"), dict) else {}
    about = site.get("about") if isinstance(site.get("about"), dict) else {}
    contact = site.get("contact") if isinstance(site.get("contact"), dict) else {}
    return {
        "success": True,
        "store": {
            "siteType": "portfolio",
            "title": clean_text(site.get("title"), req.storeName),
            "tagline": clean_text(site.get("tagline"), req.description[:120]),
            "description": clean_text(site.get("description"), req.description),
            "ctaText": clean_text(site.get("ctaText"), "Start a conversation"),
            "brand": brand,
            "typography": typography,
            "hero": {"eyebrow": clean_text(hero.get("eyebrow"), req.category or "Independent creator"), "headline": clean_text(hero.get("headline"), req.storeName), "subheadline": clean_text(hero.get("subheadline"), req.description), "ctaText": clean_text(hero.get("ctaText"), "Start a conversation")},
            "projects": projects,
            "services": services,
            "process": process,
            "about": {"heading": clean_text(about.get("heading"), "About the creator"), "body": clean_text(about.get("body"), req.description)},
            "contact": {"heading": clean_text(contact.get("heading"), "Let's make something meaningful"), "body": clean_text(contact.get("body"), "Reach out to discuss your next project."), "email": clean_text(contact.get("email"), req.contactEmail or "")},
            "sections": sections,
            "currency": req.currency,
        },
    }


@router.get("/recommendations")
async def get_recommendations(category: str = None, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = """
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating
        FROM gigs g JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
    """
    params = {}
    if category:
        query += " AND g.category = :cat"
        params["cat"] = category
    query += " ORDER BY u.rating DESC, g.created_at DESC LIMIT 12"

    result = await db.execute(text(query), params)
    return {"gigs": [dict(r) for r in result.mappings().all()]}


@router.post("/smart-match")
async def smart_match(req: SmartMatchRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Simple keyword-based matching (parameterized — no string interpolation of user input)
    keywords = req.projectDescription.lower().split()[:10]
    if not keywords:
        return {"matches": []}

    like = ilike_sql()
    params = {}
    conditions = " OR ".join(
        f"(g.title {like} :kw{i}a OR g.description {like} :kw{i}b)"
        for i in range(len(keywords))
    )
    for i, k in enumerate(keywords):
        params[f"kw{i}a"] = f"%{k}%"
        params[f"kw{i}b"] = f"%{k}%"

    cat_filter = ""
    if req.category:
        cat_filter = " AND g.category = :cat"
        params["cat"] = req.category

    query = f"""
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified
        FROM gigs g JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1 {cat_filter} AND ({conditions})
        ORDER BY u.rating DESC, g.created_at DESC
        LIMIT 10
    """
    result = await db.execute(text(query), params)
    return {"matches": [dict(r) for r in result.mappings().all()]}
