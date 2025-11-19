// Notion API configuration
// IMPORTANT: Add your credentials here before using the extension
// Get your integration token from: https://www.notion.so/my-integrations
// Get your database ID from your database URL
const NOTION_API_TOKEN = 'your_notion_integration_token_here';
const NOTION_DATABASE_ID = 'your_notion_database_id_here';
const NOTION_VERSION = '2022-06-28';

console.log('🚀 LinkedOut: Background script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request);

  if (request.action === 'scrapeProfile') {
    handleScrapeProfile(request.tabId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveToNotion') {
    handleSaveToNotion(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Handle scraping profile
async function handleScrapeProfile(tabId) {
  console.log('💉 Executing scraping script on tab:', tabId);

  // Use executeScript with the world option to run in the page context
  // This gives us immediate access to the loaded DOM
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN', // Run in page context, not isolated world
    func: scrapeLinkedInProfile
  });

  console.log('📊 Script execution results:', results);

  if (!results || !results[0] || !results[0].result) {
    throw new Error('Failed to scrape LinkedIn profile data');
  }

  const profileData = results[0].result;
  console.log('👤 Scraped profile data:', profileData);

  // Log debug info if available
  if (profileData.debug) {
    console.log('🔍 Debug - H1 elements:', profileData.debug.h1);
    console.log('🔍 Debug - H2 elements:', profileData.debug.h2);
    console.log('🔍 Debug - text-body-medium divs:', profileData.debug.divs);
  }

  return profileData;
}

// Handle saving to Notion
async function handleSaveToNotion(profileData) {
  console.log('📤 Sending to Notion...', profileData);
  await saveToNotion(profileData);
  console.log('✅ Successfully saved to Notion!');
}

// Function to scrape LinkedIn profile (injected into page)
async function scrapeLinkedInProfile() {
  // NOTE: Console logs here appear in PAGE console, not extension console!
  // Open the LinkedIn page's console (F12) to see these logs

  console.log('🔍 [PAGE CONTEXT] Starting LinkedIn profile scrape...');
  console.log('🔍 [PAGE CONTEXT] Current URL:', window.location.href);

  // Minimal wait - content script already has access to loaded page
  // Just wait a tiny bit to ensure DOM is settled
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    console.log('🔍 Page loaded, searching for elements...');

    // DIAGNOSTIC: Check what's actually on the page
    const allH1s = document.querySelectorAll('h1');
    const allTextBodyMedium = document.querySelectorAll('div.text-body-medium');
    const allTextBodyMediumBreakWords = document.querySelectorAll('div.text-body-medium.break-words');

    console.log('🔬 DIAGNOSTIC:');
    console.log(`  Total h1 elements: ${allH1s.length}`);
    console.log(`  Total div.text-body-medium: ${allTextBodyMedium.length}`);
    console.log(`  Total div.text-body-medium.break-words: ${allTextBodyMediumBreakWords.length}`);

    // Show first few of each
    if (allH1s.length > 0) {
      console.log(`  First h1 text: "${Array.from(allH1s)[0].textContent.trim().substring(0, 50)}"`);
      console.log(`  First h1 classes: "${Array.from(allH1s)[0].className.substring(0, 100)}"`);
    }
    if (allTextBodyMediumBreakWords.length > 0) {
      console.log(`  First text-body-medium.break-words: "${Array.from(allTextBodyMediumBreakWords)[0].textContent.trim().substring(0, 80)}"`);
    }

    // Collect comprehensive debug information AFTER waiting
    const allElements = {
      h1: Array.from(allH1s).map(h => ({
        text: h.textContent.trim().substring(0, 100),
        classes: h.className
      })),
      h2: Array.from(document.querySelectorAll('h2')).map(h => ({
        text: h.textContent.trim().substring(0, 100),
        classes: h.className
      })),
      divs: Array.from(allTextBodyMedium).slice(0, 10).map(d => ({
        text: d.textContent.trim().substring(0, 80),
        classes: d.className
      }))
    };

    console.log('📊 Found elements:', {
      h1Count: allElements.h1.length,
      h2Count: allElements.h2.length,
      textBodyMediumCount: allElements.divs.length
    });

    // Extract name - Look for h1 with 'inline' and 't-24' classes
    let name = '';

    // LinkedIn uses these specific classes for profile names
    const h1Elements = Array.from(document.querySelectorAll('h1'));
    console.log(`Found ${h1Elements.length} h1 elements total`);

    for (const h1 of h1Elements) {
      const classes = h1.className;
      const text = h1.textContent.trim();

      // Check if it has the right classes and reasonable text
      if (classes.includes('inline') && classes.includes('t-24') && text.length > 2 && text.length < 100) {
        name = text;
        console.log(`✅ Found name: "${name}" (classes: ${classes.substring(0, 50)}...)`);
        break;
      }
    }

    // Fallback: any h1 with reasonable text
    if (!name && h1Elements.length > 0) {
      for (const h1 of h1Elements) {
        const text = h1.textContent.trim();
        if (text.length > 2 && text.length < 100 && !text.includes('\n')) {
          name = text;
          console.log(`✅ Found name (fallback): "${name}"`);
          break;
        }
      }
    }

    // Extract headline/title
    let headlineTitle = '';
    let headlineCompany = '';

    // STEP 1: Parse headline first
    // LinkedIn shows this in div.text-body-medium.break-words
    const textBodyDivs = Array.from(document.querySelectorAll('div.text-body-medium.break-words'));
    console.log(`Found ${textBodyDivs.length} text-body-medium divs`);

    for (const div of textBodyDivs) {
      let headlineText = div.textContent.trim();

      console.log(`Raw headline text: "${headlineText}"`);

      // LinkedIn often duplicates text for accessibility - try multiple deduplication methods

      // Method 1: Check if text repeats exactly (word-by-word)
      const words = headlineText.split(/\s+/);
      const halfLength = Math.floor(words.length / 2);
      if (words.length > 2 && words.length % 2 === 0) {
        const firstHalf = words.slice(0, halfLength).join(' ');
        const secondHalf = words.slice(halfLength).join(' ');
        if (firstHalf === secondHalf) {
          headlineText = firstHalf;
          console.log(`✂️ Dedup method 1: "${headlineText}"`);
        }
      }

      // Method 2: Check if text repeats character-by-character (no spaces between)
      const halfLen = Math.floor(headlineText.length / 2);
      if (headlineText.length > 10 && headlineText.length % 2 === 0) {
        const firstHalfChars = headlineText.substring(0, halfLen);
        const secondHalfChars = headlineText.substring(halfLen);
        if (firstHalfChars === secondHalfChars) {
          headlineText = firstHalfChars;
          console.log(`✂️ Dedup method 2: "${headlineText}"`);
        }
      }

      // Method 3: Use innerText instead of textContent (might avoid aria-label duplication)
      if (headlineText.length > 100) {
        const innerTextContent = div.innerText?.trim();
        if (innerTextContent && innerTextContent.length < headlineText.length) {
          console.log(`✂️ Using innerText instead: "${innerTextContent}" (was ${headlineText.length} chars)`);
          headlineText = innerTextContent;
        }
      }

      // Skip if empty or too long
      if (!headlineText || headlineText.length < 5 || headlineText.length > 300) {
        continue;
      }

      console.log(`Final headline: "${headlineText.substring(0, 80)}"`);

      // Parse different formats:
      // Format 1: "Title, Company" (like "Member of Technical Staff, Anthropic")
      // Format 2: "Title at Company"
      // Format 3: "Title @ Company"
      // Format 4: "Title @ Company | Extra"

      // First, strip out anything after |
      const pipeIndex = headlineText.indexOf('|');
      if (pipeIndex !== -1) {
        headlineText = headlineText.substring(0, pipeIndex).trim();
      }

      // Try comma separator first (newer format)
      const commaIndex = headlineText.lastIndexOf(',');
      if (commaIndex !== -1 && commaIndex < headlineText.length - 2) {
        const potentialTitle = headlineText.substring(0, commaIndex).trim();
        const potentialCompany = headlineText.substring(commaIndex + 1).trim();

        // Valid if both parts exist and company isn't too long
        if (potentialTitle.length > 2 && potentialCompany.length > 1 && potentialCompany.length < 100) {
          headlineTitle = potentialTitle;
          headlineCompany = potentialCompany;
          console.log(`📰 Headline: title="${headlineTitle}", company="${headlineCompany}"`);
          break;
        }
      }

      // Try " at " separator
      const atWordIndex = headlineText.indexOf(' at ');
      if (atWordIndex !== -1) {
        headlineTitle = headlineText.substring(0, atWordIndex).trim();
        headlineCompany = headlineText.substring(atWordIndex + 4).trim();
        console.log(`📰 Headline: title="${headlineTitle}", company="${headlineCompany}"`);
        break;
      }

      // Try " @ " separator
      const atSymbolIndex = headlineText.indexOf(' @ ');
      if (atSymbolIndex !== -1) {
        headlineTitle = headlineText.substring(0, atSymbolIndex).trim();
        headlineCompany = headlineText.substring(atSymbolIndex + 3).trim();
        console.log(`📰 Headline: title="${headlineTitle}", company="${headlineCompany}"`);
        break;
      }

      // No separator found - use entire text as title
      if (!headlineTitle && headlineText.length > 5) {
        headlineTitle = headlineText;
        console.log(`📰 Headline: title="${headlineTitle}" (no company)`);
        break;
      }
    }

    // STEP 2: Check Experience section - this takes priority!
    // Look for the most recent position with "Present"
    console.log('Checking Experience section for current role...');
    let experienceTitle = '';
    let experienceCompany = '';
    const experienceItems = document.querySelectorAll('li.artdeco-list__item');

    for (const item of experienceItems) {
      // Look for items with "Present" to find current role
      const captionText = item.textContent;

      if (captionText.includes('Present') || captionText.includes('present')) {
        console.log('Found current experience item');

        // Extract role from t-bold element
        const roleElement = item.querySelector('.t-bold');
        if (roleElement) {
          let roleText = roleElement.textContent.trim();

          console.log(`Raw experience title: "${roleText}"`);

          // Apply all deduplication methods

          // Method 1: Word-by-word duplicate check
          const words = roleText.split(/\s+/);
          const halfLength = Math.floor(words.length / 2);
          if (words.length > 2 && words.length % 2 === 0) {
            const firstHalf = words.slice(0, halfLength).join(' ');
            const secondHalf = words.slice(halfLength).join(' ');
            if (firstHalf === secondHalf) {
              roleText = firstHalf;
              console.log(`✂️ Dedup method 1 (words): "${roleText}"`);
            }
          }

          // Method 2: Character-by-character duplicate check
          const halfLen = Math.floor(roleText.length / 2);
          if (roleText.length > 10 && roleText.length % 2 === 0) {
            const firstHalfChars = roleText.substring(0, halfLen);
            const secondHalfChars = roleText.substring(halfLen);
            if (firstHalfChars === secondHalfChars) {
              roleText = firstHalfChars;
              console.log(`✂️ Dedup method 2 (chars): "${roleText}"`);
            }
          }

          // Method 3: Try innerText instead of textContent (avoids aria-labels)
          if (roleText.length > 100) {
            const innerTextContent = roleElement.innerText?.trim();
            if (innerTextContent && innerTextContent.length < roleText.length) {
              console.log(`✂️ Using innerText: "${innerTextContent}" (was ${roleText.length} chars)`);
              roleText = innerTextContent;
            }
          }

          // Validation: Check if title looks reasonable
          const isReasonableTitle =
            roleText.length > 2 &&
            roleText.length < 200 &&
            !roleText.includes('http') && // Not a URL
            !roleText.match(/^\d+$/) && // Not just numbers
            !roleText.includes('mos') && // Not a duration
            !roleText.includes('yrs'); // Not a duration

          if (isReasonableTitle) {
            experienceTitle = roleText;
            console.log(`💼 Experience title: "${experienceTitle}"`);
          } else {
            console.log(`⚠️ Rejected invalid title: "${roleText}"`);
          }
        }

        // Extract company from t-14 t-normal span (usually contains "Company · Employment type")
        const companySpans = item.querySelectorAll('span.t-14.t-normal');
        let potentialCompanies = [];

        for (const span of companySpans) {
          let text = span.textContent.trim();

          // Log what we found
          console.log(`  Checking span: "${text.substring(0, 50)}"`);

          // Skip obvious non-company text
          const shouldSkip =
            text.includes('Present') ||
            text.includes('mos') ||
            text.includes('mo ') ||
            text.includes('yr') ||
            text.match(/\d{4}/) || // Contains year
            text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) || // Starts with month
            text.length < 2 ||
            text.length > 150;

          if (shouldSkip) {
            console.log(`  ⏭️ Skipping (date/invalid): "${text.substring(0, 30)}"`);
            continue;
          }

          // Company is usually in format "Company · Full-time" or just "Company"
          if (text.includes('·')) {
            const parts = text.split('·');
            const companyPart = parts[0].trim();

            // Deduplicate company name
            const companyWords = companyPart.split(/\s+/);
            const companyHalfLen = Math.floor(companyWords.length / 2);
            if (companyWords.length > 1 && companyWords.length % 2 === 0) {
              const firstHalf = companyWords.slice(0, companyHalfLen).join(' ');
              const secondHalf = companyWords.slice(companyHalfLen).join(' ');
              if (firstHalf === secondHalf) {
                text = firstHalf;
                console.log(`  ✂️ Deduped company: "${text}"`);
              }
            }

            if (companyPart.length > 1) {
              potentialCompanies.push(companyPart);
            }
          } else {
            // No separator, might be just company name
            potentialCompanies.push(text);
          }
        }

        // Pick the first valid company (usually the most relevant)
        if (potentialCompanies.length > 0) {
          experienceCompany = potentialCompanies[0];
          console.log(`💼 Experience company: "${experienceCompany}"`);
          if (potentialCompanies.length > 1) {
            console.log(`  (Also found: ${potentialCompanies.slice(1).join(', ')})`);
          }
        }

        // Found current experience, stop searching
        if (experienceTitle || experienceCompany) {
          break;
        }
      }
    }

    // STEP 3: Hybrid prioritization - experience primary, headline fallback
    let title = '';
    let company = '';

    // Prioritize experience section (more accurate/current) over headline (may be outdated)
    // Fall back to headline if experience is missing or problematic

    // Title selection
    if (experienceTitle && experienceTitle.length > 2) {
      title = experienceTitle;
      console.log(`✓ Using experience title: "${title}"`);

      if (headlineTitle && headlineTitle !== experienceTitle) {
        console.log(`  (Headline had: "${headlineTitle}")`);
      }
    } else if (headlineTitle && headlineTitle.length > 2) {
      title = headlineTitle;
      console.log(`✓ Using headline title (no experience): "${title}"`);
    }

    // Company selection
    if (experienceCompany && experienceCompany.length > 1 && !experienceCompany.includes('Present')) {
      company = experienceCompany;
      console.log(`✓ Using experience company: "${company}"`);

      if (headlineCompany && headlineCompany !== experienceCompany) {
        console.log(`  (Headline had: "${headlineCompany}")`);
      }
    } else if (headlineCompany && headlineCompany.length > 1) {
      company = headlineCompany;
      console.log(`✓ Using headline company (no valid experience): "${company}"`);
    }

    console.log(`✅ Final: title="${title}", company="${company}"`)

    // Fallback: try company logo button area
    if (!company) {
      console.log('Looking for company in logo/button area...');
      const companyButtons = document.querySelectorAll('button[aria-label*="company"]');
      for (const button of companyButtons) {
        const companyText = button.textContent.trim();
        if (companyText.length > 1 && companyText.length < 100 && !companyText.includes('Click to skip')) {
          const lines = companyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            company = lines[lines.length - 1];
            console.log(`✅ Found company in button: "${company}"`);
            break;
          }
        }
      }
    }

    // Get profile URL
    const url = window.location.href.split('?')[0];

    const result = {
      name: name || 'Unknown',
      title: title || 'Not specified',
      company: company || 'Not specified',
      url: url,
      debug: allElements
    };

    console.log('✅ Scraping complete:', result);
    return result;
  } catch (error) {
    console.error('❌ Scraping error:', error);
    throw new Error('Failed to scrape profile data');
  }
}

// Save profile data to Notion
async function saveToNotion(profileData) {
  console.log('📝 Preparing Notion API request...');
  const notionApiUrl = 'https://api.notion.com/v1/pages';

  const requestBody = {
    parent: {
      database_id: NOTION_DATABASE_ID
    },
    properties: {
      'Name': {
        title: [
          {
            text: {
              content: profileData.name
            }
          }
        ]
      },
      'Company': {
        rich_text: [
          {
            text: {
              content: profileData.company
            }
          }
        ]
      },
      'Role': {
        rich_text: [
          {
            text: {
              content: profileData.title
            }
          }
        ]
      },
      'LinkedIn': {
        url: profileData.url
      }
    }
  };

  // Add Notes if provided
  if (profileData.notes && profileData.notes.length > 0) {
    requestBody.properties['Notes'] = {
      rich_text: [
        {
          text: {
            content: profileData.notes
          }
        }
      ]
    };
  }

  console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(notionApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: JSON.stringify(requestBody)
  });

  console.log('📥 Notion API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Notion API error:', errorData);
    throw new Error(`Notion API error: ${errorData.message || response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ Notion API success:', result);
  return result;
}

