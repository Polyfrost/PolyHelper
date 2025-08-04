import { formatEmoji } from "discord.js";

const DevUser = "ethan";
const user = process.env["USER"] || process.env["USERNAME"];
export const isDevUser = user == DevUser;
export const repoFilesURL =
  "https://github.com/SkyblockClient/SkyblockClient-REPO/raw/main/files";
export const shrug = "¯\\_(ツ)_/¯";
export const repoURL = "https://github.com/Polyfrost/PolyHelper";
export const assetsBase = `${repoURL}/raw/rewrite/assets`;

export const SkyClient = {
  id: "780181693100982273",
  channels: {
    General: "780181693553704973",
    SkyblockTalk: "1110717104757416027",
    Trolling: "887818760126345246",
    BotCommands: "796546551878516766",
    BotLogs: "934968221923168266",
    Tickets: "1222344626325688330",
    ModUpdating: "1198710827327434852",
    Support: "931624995522773032",
  },
  roles: {
    CoolPeople: "832754819588292679",
    NoGiveaways: "832325812329906176",
    GitHubKeeper: "799020944487612428",
    NoAuto: "852016624605462589",
    GiveawayBypass: "1187979851706142793",
    GiveawayDonor: "1186726399789248693",
    SupportTeam: "931626562539909130",
  },
};

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
  },
};

export const DevServer = {
  id: "959660149344198706",
  roles: {
    SupportTeam: "1240761899092803715",
  },
};

export const Users = {
  TicketTool: "557628352828014614",
  Fire: "444871677176709141",
  BotDev: "157917665162297344",
  nacrt: "435443705055543306",
};

export const EmojiIDs = {
  Windows: "1369004272880189611",
  Java: "1369004299182407853",
  Chrome: "1369004226000322600",
  YouWhat: "889306727953104936",
  BlameWyvest: "1001055682289741864",
};

// Animated Emojis
export const AEmojiIDs: Record<string, string> = {};

export const Emojis = {
  ...(Object.fromEntries(
    Object.entries(EmojiIDs).map(([k, v]) => [k, formatEmoji(v)]),
  ) as Record<keyof typeof EmojiIDs, `<:_:${string}>`>),
  ...(Object.fromEntries(
    Object.entries(AEmojiIDs).map(([k, v]) => [k, formatEmoji(v, true)]),
  ) as Record<keyof typeof EmojiIDs, `<a:_:${string}>`>),

  Thinking: "🤔",
  Shaking: "🫨",
  Light: "💡",
  MindBlown: "🤯",
  Eyes: "👀",
};

export const SupportTeams: Record<string, string> = {
  [SkyClient.id]: SkyClient.roles.SupportTeam,
  [Polyfrost.id]: Polyfrost.roles.SupportTeam,
  [DevServer.id]: DevServer.roles.SupportTeam,
};
