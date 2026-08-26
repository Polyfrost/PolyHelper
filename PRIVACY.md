# Privacy Policy for PolyHelper

---

## What Data We Look At

- **Crash Logs & Pastes:** If you upload a `.txt` or `.log` file, or paste a
  link from a site like `mclo.gs` or `hst.sh`, the bot reads the content to
  figure out why Minecraft crashed and help you fix it.
- **Basic Discord Details:** The bot processes basic info like your Discord User
  ID, username, channel context, and relevant server roles (such as staff roles
  or feature restriction flags) so commands and support features work properly.
- **Form Submissions:** If you submit info through an interactive bot modal, we
  process your input to handle your request.

---

## What We Use It For

- **Troubleshooting Crashes:** Analyzing log files to automatically give you
  crash solutions.
- **Cleaning & Hosting Logs:** Sending uploaded logs to
  [mclo.gs](https://mclo.gs) to strip out sensitive info (like local computer
  file paths) and generate clean, readable links.
- **Support & Ticket Operations:** Managing support tickets and administrative
  logging for server staff.

We **do not** sell, rent, or share your data with advertisers or marketers.
Ever.

---

## External Services We Work With

- **mclo.gs:** Uploaded log files and basic uploader tags are sent to mclo.gs
  for sanitization and hosting. You can check out their policy at
  <https://aternos.gmbh/en/mclogs/privacy>.
- **GitHub:** We fetch crash definitions from GitHub
  ([Polyfrost/CrashData](https://github.com/Polyfrost/CrashData)). No personal
  user data is sent to GitHub.
- **Discord:** All commands and messages pass through Discord's API as standard
  bot traffic.

---

## Data Storage & Retention

- **No Databases:** We don't store your personal info or profile data in a
  database. Your roles and permissions are checked live through Discord whenever
  a command is run.
- **Temporary Cache:** Log results and raw text are held in temporary memory
  briefly so the bot can respond quickly.
- **mclo.gs Retention:** Files sent to mclo.gs are stored according to mclo.gs's
  own retention rules.

---

## How to Opt Out

If you don't want the bot to automatically analyze a log file you post in chat,
do one of the following:

- Include `poly ignore` anywhere in your message.
- Start your message with Discord's `@silent` tag.

---

## Questions or Updates?

Have questions? Feel free to ask in the
[Polyfrost Discord server](https://polyfrost.org/discord) or open an issue on
our [GitHub Repository](https://github.com/Polyfrost/PolyHelper).
