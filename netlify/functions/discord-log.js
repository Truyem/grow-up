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
    
    // Hardcoded credentials as requested to fix 401 error
    const token = "ODE3NDAxNTM0NDYzMjEzNjI4.GOuDpf.Y4Hw87Jc0GwT3FqidBWI0wivsrFdjTFWvbdmv8";
    const channelId = "1442368821481570405";

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