# LinkedOut

Capture essential LinkedIn profile info to your Notion database without the copy-paste dance across tabs.

Built with Claude Code. I'm a creative writer with little background in CS who's taken up vibe coding for funsies. Sorry if the codebase is messy, I'm learning. Feel free to callout better approaches or techniques!

## Function

You're on someone's LinkedIn. They're interesting. You want to remember them. LinkedOut grabs their name, role, company, profile URL  and drops it straight into your Notion database.

1. Click the extension icon. 
2. Small pop-up shows data parsed into Name, Role, Company, URL fields. Also gives a custom Notes box.  
3. Click save.
4. Creates a new line with the info in your Notion database. 

* Pop-up window is editable, so you can make sure the entry is clean before it hits your Notion. This step helps if LinkedIn is being weird 		  or someone has 'Hustler | Grinder | Helping You Achieve Your Dreams' in their subhead.
* Prioritizes data capture from the official 'Experience' section first, and  falls back to their custom subhead (below their name) if needed.


## Good For

Me. I built this to augment my networking and lead-prospecting workflow. Stay in research mode, then shift to data cleanup and followup mode. 

Might be good for you too...? I'm sure Sales professionals have all manner of enterprise-level tools for pipeline building and lead generation, but this one is clean, simple, and free.

## Setup

### Get the Extension Running

**Works on Chromium-based browsers**

1. Download this repo
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Toggle on "Developer mode" 
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
6. Copy that long token

#### Set Up Your Database

1. In Notion, create a database (table view works best)
2. Add these columns:
   - **Name** (Title)(Default Notion Database property; cannot be deleted)
   - **Role** (Text)
   - **Company** (Text)
   - **LinkedIn** (URL)
   - **Notes** (Text)
3. Click the "..." menu on your database → Connections → Add your LinkedOut integration
4. Grab the database ID from the URL—it's that long random string between your workspace name and the `?v=`

#### Add Your Credentials

1. In the extension folder, copy `config.example.js` to create a new file called `config.js`
2. Open `config.js` and add your credentials:
   ```javascript
   const CONFIG = {
     NOTION_API_TOKEN: 'ntn_your_actual_token_here',
     NOTION_DATABASE_ID: 'your_actual_database_id_here',
     NOTION_VERSION: '2022-06-28'
   };
   ```
3. Save the file
4. Reload the extension in your browser

**Note**: `config.js` is gitignored, so your credentials stay local and won't be pushed to GitHub if you fork or contribute.

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

## Files

```
LinkedOut/
├── manifest.json          # Extension config
├── background.js          # Does the scraping and Notion API stuff
├── popup.html            # What you see when you click the icon
├── popup.js              # Popup logic
├── content.js            # Helper (mostly unused)
├── icons/                # Extension icons
├── config.example.js     # Template for your credentials
├── config.js             # Your actual credentials (gitignored, you create this)
├── .gitignore            # Keeps secrets out of git
└── README.md             # You're reading it
```

## Contributing

Found a bug? Have an idea? Open an issue or send a PR.

## License

MIT. Do what you want with it.

## Author

Built by [@pleadthefish](https://github.com/pleadthefish)
