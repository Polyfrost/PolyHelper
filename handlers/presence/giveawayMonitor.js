const streaks = {};

/**
 * @param {import("../../bot.js").MessageData} message
 */
export const command = async ({ content, author, channel, guild, client }) => {
  const member = guild.members.cache.get(author.id);
  if (!member) return;
  if (channel.id == "887818760126345246") return; // exclude trolling
  if (member.roles.cache.has("832754819588292679")) return; // cool people
  if (member.roles.cache.has("832325812329906176")) return; // already has no giveaways

  let streak = streaks[author.id] || [];

  const words = content.match(/\w+/g);
  if (!words) return;

  const isShort = words.length < 3;
  if (isShort) {
    streak.push(words);
  } else {
    streak = [];
  }
  streaks[author.id] = streak;

  if (streak.length == 6) {
    try {
      member.roles.add("832325812329906176");
      const verboseBotLogs = /** @type {import("discord.js").TextChannel} */ (
        client.channels.cache.get("934968221923168266")
      );
      if (verboseBotLogs) {
        verboseBotLogs.send(
          `${author.id} (${author.username}) sent 6 low effort messages in a row, so they were blocked from giveaways
          \`\`\`json
          ${JSON.stringify(streak, null, 4)}
          \`\`\`
          `
        );
      }
    } catch (e) {}
  }
};

export const when = {
  all: "messages",
  desc: "Flags users who are spamming for giveaways",
};
