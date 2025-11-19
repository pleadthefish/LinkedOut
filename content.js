// Content script for LinkedIn profile pages
console.log('LinkedOut: Content script loaded on', window.location.href);

// Listen for scrape requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeFromContent') {
    console.log('📨 Content script received scrape request');

    // Simple immediate test - what do we see RIGHT NOW?
    const h1Count = document.querySelectorAll('h1').length;
    const divCount = document.querySelectorAll('div.text-body-medium').length;

    console.log(`Immediate check: ${h1Count} h1s, ${divCount} divs`);

    sendResponse({
      h1Count: h1Count,
      divCount: divCount,
      url: window.location.href
    });
  }
  return true;
});
