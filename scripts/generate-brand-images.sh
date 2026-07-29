#!/bin/bash
# ==============================
# Erq Brand Screenshot Generator
# ==============================
# Run: bash scripts/generate-brand-images.sh
# Requires: Pika MCP installed and authenticated
#   npx skills add Pika-Labs/Pika-Plugins -all -y
#
# This script uses curl to send JSON-RPC requests to the Pika MCP endpoint.
# Alternatively, you can use the Pika MCP client tools if available.
# ==============================

MCP_ENDPOINT="https://experiment-mcp.pika.art/api/mcp"
OUTPUT_DIR="public/brand"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Erq Brand Screenshot Generator"
echo "=================================="
echo "Endpoint: $MCP_ENDPOINT"
echo "Output:   $OUTPUT_DIR/"
echo ""
echo "📝 Note: If MCP is configured in your environment, use the MCP tool"
echo "   'generate_image' or 'pika_generate' with the prompts below instead."
echo ""

# ====== Function to display a prompt for manual/CLI use ======
show_prompt() {
  local name="$1"
  local prompt="$2"
  echo "========================================"
  echo "📸 $name"
  echo "========================================"
  echo "Prompt:"
  echo "$prompt"
  echo ""
  echo "To generate via MCP, send this JSON-RPC to $MCP_ENDPOINT:"
  echo ""
  cat << EOF
curl -X POST "$MCP_ENDPOINT" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \$PIKA_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "pika_generate",
      "arguments": {
        "prompt": "'"${prompt//\'/\\\'}"'",
        "width": 1920,
        "height": 1080,
        "output": "'"$OUTPUT_DIR/$name.png"'"
      }
    },
    "id": 1
  }'
EOF
  echo ""
  echo "---"
  echo ""
}

# ====== Logo Prompts ======
echo ""
echo "🔤 LOGO & BRAND KIT"
echo "========================================"
echo ""

show_prompt "main-logo" "Modern minimalist logo for \"Erq\" marketplace. Clean sans-serif typography with the word \"Erq\" in bold green (#16a34a). A subtle Ethiopian cross or star motif integrated into the letter \"E\". Warm earth-tone background (#f5efe6). Professional tech-startup aesthetic with Ethiopian identity. SVG-friendly flat design. No photos, just logo mark."

show_prompt "logo-icon-mark" "Standalone icon mark for Erq marketplace. A stylized Ethiopian \"E\" with green gradient (#16a34a to #15803d). Geometric and modern, inspired by Ethiopian cross patterns. Simple enough for favicon usage. Glossy claymorphism texture. Isolated on transparent background. Tech startup aesthetic."

show_prompt "logo-dark-variant" "Dark mode variant of Erq marketplace logo. The word \"Erq\" in bright green (#22c55e) on dark clay background (#433930). Subtle glow effect. Same Ethiopian cross/star motif. Professional and premium feel. For dark-themed landing pages and dashboards."

show_prompt "social-media-kit" "Social media brand kit for Erq marketplace. A flat lay showing: logo on business card, laptop screen showing homepage, phone showing mobile app, green notebook with brand sketches, Ethiopian coffee beans. Warm clay tones. Professional photography style with warm lighting. Perfect for LinkedIn and Twitter banner."

# ====== Display all 8 prompts ======
show_prompt "hero-homepage" "A modern Ethiopian freelance marketplace homepage hero — warm clay tones (#faf7f2, #f5efe6), green accents (#16a34a). Show a diverse team of freelancers collaborating around a glowing laptop. The Erq logo is in the top-left. Clean UI with search bar. Claymorphism card style. Ethiopian-inspired pattern subtle background."

show_prompt "marketplace-grid" "Erq marketplace gig listing grid with claymorphism card design. Warm beige backgrounds (#f5efe6), green CTA buttons. Show 6 gig cards with profile avatars, prices in ETB, star ratings. Categories sidebar on left. Ethiopian cultural patterns subtly in background."

show_prompt "analytics-dashboard" "Financial analytics dashboard for Erq marketplace. SVG line charts showing revenue growth (MRR, ARR), bar charts for daily balance. Claymorphism cards with warm clay tones. Green gradient accents. Time range selectors. Modern data visualization with soft shadows."

show_prompt "freelancer-profile" "Erq freelancer profile page with claymorphism design. Portfolio gallery grid, skill badges in green tones, rating stars, completed jobs count. Avatar with online status dot. Warm beige and cream palette. Ethiopian-inspired UI elements."

show_prompt "ai-store-builder" "AI-powered store builder interface for Erq marketplace. Step-by-step wizard with claymorphism cards. Preview pane showing an online store with Ethiopian products. AI suggestions panel on right. Green accent buttons. Clean modern layout."

show_prompt "mobile-app" "Mobile view of Erq freelance marketplace. iPhone mockup showing the gig details page with claymorphism card design. Bottom navigation dock. Green notification badges. Ethiopian flag colors subtly in the brand elements. Warm clay backgrounds."

show_prompt "dispute-resolution" "Erq dispute resolution center with admin panel. Split-screen view showing client and freelancer evidence. Resolution buttons: Refund, Release, Split 50/50. Claymorphism cards, warm tones, green accents. Escrow balance widget."

show_prompt "referral-system" "Erq referral system page with shareable link, stats counter showing signups and earnings. Confetti celebration effect. Friend referral card with avatar. Warm clay background with green accent buttons. Ethiopian 'Habesha' aesthetic modernized."

echo ""
echo "🎉 All prompts displayed!"
echo "📁 Images will save to: $OUTPUT_DIR/"
echo ""
echo "To generate via CLI (if pika-cli is available):"
echo "  npx pika-cli generate --prompt \"...\" --output $OUTPUT_DIR/name.png"
echo ""
echo "Or use the individual curl commands above for each image."
