export const handler = async (event) => {
  // Allow basic CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { title, description, fields, color } = JSON.parse(event.body);
    
    // Read Environment Variables from Server (Netlify Dashboard)
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;

    if (!token || !channelId) {
      console.error("Missing Discord Configuration (DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID)");
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Server misconfigured: Missing Discord Env Vars" }) 
      };
    }

    // Call Discord API from the Server Side
    const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title, description, fields, color,
          timestamp: new Date().toISOString(),
          footer: { text: "Grow Up App • Daily Planner" }
        }]
      })
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord API returned error:", errorText);
      return { statusCode: discordResponse.status, headers, body: errorText };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error("Function Handler Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(error) }) };
  }
};