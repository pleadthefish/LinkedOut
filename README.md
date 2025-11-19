# LinkedOut

Save LinkedIn profiles to your Notion database without the copy-paste dance.

## What It Does

You're on someone's LinkedIn. They're interesting. You want to remember them. LinkedOut grabs their name, role, and company—then drops it straight into your Notion database.

Two clicks. Done.

## Why It's Better

- **Actually editable**: The popup shows what it found. If LinkedIn's being weird (or someone wrote "Hustler | Grinder | Dream Chaser" as their headline), you can fix it before it hits Notion
- **Smart about it**: Pulls from the official Experience section first—the stuff people actually keep current. Falls back to their headline if needed
- **Handles LinkedIn's quirks**: Deduplicates text, parses different formats ("at" vs "@" vs comma), skips dates that look like companies
- **Minimal design**: Clean popup that doesn't get in your way

## How to Use It

1. See someone interesting on LinkedIn
2. Click the LinkedOut icon
3. Check the popup (name, role, company are auto-filled)
4. Edit if needed, hit Save
5. They're in your Notion database

That's it.

## Setup

### Get the Extension Running

**Works on Chrome, Brave, Edge, Arc—anything Chromium-based:**

1. Download this repo
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Flip on "Developer mode" (top right)
4. Click "Load unpacked"
5. Point it at the folder you downloaded

### Connect to Notion

#### Make an Integration

Notion needs permission to let the extension write to your database.

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "+ New integration"
3. Name it whatever (I use "LinkedOut")
4. Pick your workspace
5. Hit Submit
6. Copy that long token (starts with `ntn_`)—you'll need it in a sec

#### Set Up Your Database

1. In Notion, create a database (table view works best)
2. Add these columns:
   - **Name** (Title)
   - **Role** (Text)
   - **Company** (Text)
   - **LinkedIn** (URL)
3. Click the "..." menu on your database → Connections → Add your LinkedOut integration
4. Grab the database ID from the URL—it's that long random string between your workspace name and the `?v=`

#### Drop Your Credentials Into the Code

1. Open `background.js` in the extension folder
2. Lines 4-5 have placeholders—swap them out:
   ```javascript
   const NOTION_API_TOKEN = 'your_actual_token_here';
   const NOTION_DATABASE_ID = 'your_actual_database_id_here';
   ```
3. Reload the extension in your browser

Now you're cooking.

## How It Actually Works

When you click the icon, LinkedOut:

1. Grabs the person's **name** from the profile header
2. Checks their **Experience section** for their current role (the one marked "Present")
   - Why Experience and not the headline? Because people update their job history when they switch roles. Headlines? Not always. Plus Experience has structured data with dates—way more reliable
3. If Experience is empty or messy, it falls back to the **headline** (that subhead right under their name)
4. Cleans up duplicates (LinkedIn loves repeating text for accessibility—"Head of SalesHead of Sales" becomes "Head of Sales")
5. Validates everything (filters out dates, random numbers, URLs that snuck in)
6. Shows you what it found in the popup so you can fix anything weird

Then you click Save and it's in Notion.

## When Things Go Sideways

**Popup shows "Unknown" for everything:**
- Reload the LinkedIn page and try again
- Make sure you're actually on a profile (`linkedin.com/in/something`)
- Check the browser console for what went wrong

**"Cannot read properties of undefined...":**
- This means the extension doesn't have permission to run scripts. Should be fixed already (check `manifest.json` has `"scripting"` in permissions)

**"Notion API error":**
- Double-check your token and database ID
- Make sure your integration is connected to that specific database
- Verify the column names match exactly: Name, Role, Company, LinkedIn

**Still seeing duplicate text:**
- Shouldn't happen anymore—there's triple-layer deduplication now
- If it does, open the page console (F12 on the LinkedIn page) and look for the parsing logs. They'll show what text was found and which dedup method ran

## What's Under the Hood

Built with Chrome Extension Manifest V3. Uses:
- `activeTab` permission (only when you click the icon)
- `scripting` permission (to read the LinkedIn page)
- `notifications` and `storage` (for future features)
- Notion API v2022-06-28

Chromium browsers only (sorry Firefox folks—different extension system).

## Files

```
linkedin-to-notion-extension/
├── manifest.json          # Extension config
├── background.js          # Does the scraping and Notion API stuff
├── popup.html            # What you see when you click the icon
├── popup.js              # Popup logic
├── content.js            # Helper (mostly unused)
├── icons/                # Extension icons
├── config.example.js     # Example for config setup
├── .gitignore            # Keeps secrets out of git
└── README.md             # You're reading it
```

## Contributing

Found a bug? Have an idea? Open an issue or send a PR.

## License

MIT. Do what you want with it.

## Author

Built by [@pleadthefish](https://github.com/pleadthefish)
