
interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export const sendDiscordLog = async (title: string, description: string, fields: DiscordField[], color: number) => {
  try {
    // Send request to our own Netlify Function proxy
    // This avoids CORS issues and hides the Bot Token from the browser
    const response = await fetch('/.netlify/functions/discord-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        fields,
        color
      })
    });

    if (!response.ok) {
      console.warn(`Failed to send Discord log via Proxy. Status: ${response.status}`);
    }
  } catch (error) {
    // Silent fail to not disrupt user experience
    console.error("Discord Log Error:", error);
  }
};
