
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const TARGET_USER_ID = "817401534463213628";

export const sendDiscordCheckIn = async (note: string): Promise<boolean> => {
  if (!DISCORD_BOT_TOKEN) {
    console.error("Discord Bot Token is missing.");
    return false;
  }

  try {
    // 1. Create DM Channel with the user
    const channelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: TARGET_USER_ID
      })
    });

    if (!channelResponse.ok) {
      const err = await channelResponse.json();
      console.error('Discord Create DM Error:', err);
      return false;
    }

    const channelData = await channelResponse.json();
    const channelId = channelData.id;

    // 2. Send Message to the channel
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `✅ **ĐIỂM DANH GYM**\nTime: ${new Date().toLocaleString('vi-VN')}\nNote: ${note}`
      })
    });

    if (!messageResponse.ok) {
        const err = await messageResponse.json();
        console.error('Discord Send Message Error:', err);
        return false;
    }

    return true;
  } catch (error) {
    console.error('Discord API Network Error:', error);
    return false;
  }
};
