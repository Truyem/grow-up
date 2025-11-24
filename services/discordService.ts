
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export const sendDiscordLog = async (title: string, description: string, fields: DiscordField[], color: number) => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) {
    console.warn("Discord configuration missing (Token or Channel ID). Skipping log.");
    return;
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title,
          description,
          fields,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: "Grow Up App • Daily Planner" }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord API Error:", errorText);
    }
  } catch (error) {
    console.error("Failed to send Discord log", error);
  }
};
