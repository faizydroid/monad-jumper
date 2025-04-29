# NadsBot MCP Integration Guide

This document provides instructions for upgrading NadsBot from the current pattern-based feedback to a true AI-powered assistant using the Model Context Protocol (MCP).

## Current Implementation

NadsBot currently works with a pattern-matching approach:
- Game data is collected during gameplay (jumps, score, death reason, etc.)
- This data is stored in the `game_sessions` Supabase table
- Pre-defined feedback patterns provide responses based on performance metrics
- The feedback includes a funny comment and practical advice

## Upgrading to MCP

### 1. Set Up MCP Server

Create an MCP server using one of the following options:

#### Option A: Using Cloudflare Workers

1. Create a new Cloudflare Worker project:
   ```
   npm create cloudflare@latest nadsbot-mcp -- --type=worker
   ```

2. Install MCP dependencies:
   ```
   npm install model-context-protocol @anthropic-ai/sdk
   ```

3. Configure your worker to handle MCP requests (see sample code below)

#### Option B: Using Next.js Template

1. Clone the Next.js MCP template:
   ```
   git clone https://github.com/YOUR_REPOSITORY/next-mcp-template.git nadsbot-mcp
   cd nadsbot-mcp
   npm install
   ```

2. Configure the API routes for NadsBot (see sample code below)

### 2. MCP Integration Code

Replace the `generateAIFeedback` function in `src/components/NadsBot.jsx` with this code:

```jsx
// Generate AI feedback based on game data using MCP
const generateAIFeedback = async (data) => {
  try {
    // Prepare the game data for the MCP request
    const gameMetrics = {
      score: data.score,
      jumps: data.jumps,
      deathReason: data.deathReason,
      platformTypes: data.platformTypes,
      shotsFired: data.shotsFired || 0,
      enemiesKilled: data.enemiesKilled || 0,
      duration: data.duration,
      efficiency: data.jumps > 0 ? data.score / data.jumps : 0,
      playerStats: {
        highScore: playerHighScore,
        totalJumps: totalJumps,
        averageJumpScore: totalJumps > 0 ? playerHighScore / totalJumps : 0
      }
    };
    
    // Define the prompt for Claude
    const prompt = `# JumpNads AI Game Assistant (NadsBot)

You are NadsBot, a fun and helpful AI assistant inside the blockchain game "JumpNads".

Analyze the player's performance from their latest game:
${JSON.stringify(gameMetrics, null, 2)}

Your job is to:
1. Analyze how the player performed based on the metrics.
2. Offer one funny comment based on their style or mistake.
3. Give one useful tip to help them improve.
4. Keep it short and engaging.

Format your response as:
{
  "funnyComment": "Your funny comment here",
  "advice": "Your practical advice here"
}
`;

    // Call the MCP endpoint
    const response = await fetch('https://your-mcp-endpoint.com/api/nadsbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_MCP_API_KEY}`
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error(`MCP service error: ${response.statusText}`);
    }
    
    // Parse the AI response
    const aiResponse = await response.json();
    return {
      funnyComment: aiResponse.funnyComment,
      advice: aiResponse.advice
    };
  } catch (err) {
    console.error('Error calling MCP:', err);
    
    // Fallback to pattern-based feedback if MCP fails
    const jumpEfficiency = data.score / Math.max(1, data.jumps);
    // ... (rest of the existing pattern-based feedback code)
  }
};
```

### 3. MCP Server Implementation

Here's a sample implementation for your MCP server:

```javascript
// MCP Server using Cloudflare Workers
import { MCP } from 'model-context-protocol';
import { Anthropic } from '@anthropic-ai/sdk';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    
    // Only handle POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    
    try {
      // Parse request body
      const data = await request.json();
      const { prompt } = data;
      
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY
      });
      
      // Create MCP instance
      const mcp = new MCP({ client: anthropic });
      
      // Process the prompt with Claude
      const response = await mcp.process({
        messages: [
          { role: "user", content: prompt }
        ],
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000
      });
      
      // Parse the JSON response from Claude
      let formattedResponse;
      try {
        // Try to parse the JSON response
        const responseText = response.content[0].text;
        formattedResponse = JSON.parse(responseText);
      } catch (parseError) {
        // If parsing fails, extract using regex
        const funnyMatch = response.content[0].text.match(/"funnyComment":\s*"([^"]+)"/);
        const adviceMatch = response.content[0].text.match(/"advice":\s*"([^"]+)"/);
        
        formattedResponse = {
          funnyComment: funnyMatch ? funnyMatch[1] : "Nice game!",
          advice: adviceMatch ? adviceMatch[1] : "Keep practicing!"
        };
      }
      
      // Return the formatted response
      return new Response(JSON.stringify(formattedResponse), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      // Handle errors
      console.error("MCP error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
```

### 4. Environment Variables

Add these environment variables to your project:

```
VITE_MCP_API_KEY=your_api_key_here
VITE_MCP_ENDPOINT=https://your-mcp-endpoint.com/api/nadsbot
```

### 5. Testing and Deployment

1. Test locally:
   - Deploy your MCP server to a test environment
   - Update your local environment variables
   - Test the integration with sample game data

2. Production deployment:
   - Deploy your MCP server to production
   - Update environment variables in your deployment platform
   - Monitor the integration and fine-tune the prompt as needed

## Advanced Features

Once you have the basic MCP integration working, consider these enhancements:

1. **Player Progress Tracking**: Include historical performance data in the prompt to allow NadsBot to comment on player improvement.

2. **Leaderboard Context**: Add leaderboard information to help NadsBot provide competitive insights.

3. **Streak Recognition**: Track and acknowledge win/loss streaks and milestone achievements.

4. **Multi-turn Conversations**: Enhance NadsBot to allow players to ask follow-up questions about their gameplay.

5. **Personalization**: Store player preferences and play style to enable more personalized feedback.

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Anthropic Claude API Documentation](https://docs.anthropic.com)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Next.js MCP Template Repository](https://github.com/your-repo/next-mcp-template) 