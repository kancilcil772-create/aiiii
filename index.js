require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const historyMap = new Map();

client.once('ready', () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.AI_CHANNEL_ID) return;

  const userId = message.author.id;
  const history = historyMap.get(userId) || [];

  history.push({ role: 'user', content: message.content });

  try {
    await message.channel.sendTyping();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'Kamu adalah asisten AI yang ramah dan membantu di server Discord ini. Jawab singkat, jelas, dan pakai bahasa Indonesia kecuali diminta lain.',
      messages: history,
    });

    const reply = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    history.push({ role: 'assistant', content: reply });
    historyMap.set(userId, history.slice(-10));

    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1990}/g);
      for (const chunk of chunks) await message.reply(chunk);
    } else {
      await message.reply(reply);
    }
  } catch (err) {
    console.error(err);
    message.reply('Maaf, terjadi error saat memproses pesanmu.');
  }
});

client.login(process.env.DISCORD_TOKEN);
