import { formatEmoji } from "discord.js";
import { mapValues } from "es-toolkit/object";

export const shrug = "¯\\_(ツ)_/¯";
export const repoURL = "https://github.com/Polyfrost/PolyHelper";
export const assetsBase = `${repoURL}/raw/main/assets`;

export const Polyfrost = {
  id: "822066990423605249",
  channels: {
    General: "832981571077537823",
    TestingChat: "1262485089615351829",
    BotLogs: "1225178336532369598",
    PatreonAd: "1336584021458681876",
  },
  forums: {
    Suggestions: "1265704794778243276",
  },
  categories: {
    BugReports: "1063715268687310869",
  },
  roles: {
    NoGiveaways: "1182506496156766250",
    SupportTeam: "997376364460114001",
    Testers: "1262485117549412487",
    DevAccess: "1388282908443148378",
    NoCounting: "1116377446393057280",
    ModTeam: "822070886223052841",
    PolyTeam: "982578079673245726",
  },
} as const;

export const DevServer = {
  id: "959660149344198706",
  roles: {
    SupportTeam: "1240761899092803715",
  },
} as const;

export const Users = {
  TicketTool: "557628352828014614",
  Fire: "444871677176709141",
  BotDev: "157917665162297344",
  nacrt: "435443705055543306",
} as const;

export const EmojiIDs = {} as const;

// Animated Emojis
export const AEmojiIDs = {} as const;

const emojiMap = mapValues(EmojiIDs, (v) => formatEmoji(v)) as {
  -readonly [K in keyof typeof EmojiIDs]: `<:emoji:${typeof EmojiIDs[K]}>`;
};

const aEmojiMap = mapValues(AEmojiIDs, (v) => formatEmoji(v, true)) as {
  -readonly [K in keyof typeof AEmojiIDs]: `<a:emoji:${typeof AEmojiIDs[K]}>`;
};

export const Emojis = {
  ...emojiMap,
  ...aEmojiMap,

  Thinking: "🤔",
  Shaking: "🫨",
  Light: "💡",
  MindBlown: "🤯",
  Eyes: "👀",
  Check: "✅",
  Cross: "❌",
} as const;

export const SupportTeams: Readonly<Record<string, string>> = {
  [Polyfrost.id]: Polyfrost.roles.SupportTeam,
  [DevServer.id]: DevServer.roles.SupportTeam,
};
