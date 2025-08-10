const { chromium } = require('playwright');

(async () => {
  console.log('Starting browser test...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: true, // Run in headless mode
    slowMo: 100 // Slow down actions slightly
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error));
  
  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshot-1-initial.png', fullPage: true });
    console.log('Screenshot saved: screenshot-1-initial.png');
    
    // Check if login form exists
    const loginInput = await page.$('input[type="text"]');
    if (loginInput) {
      console.log('Found login input, logging in as Luke...');
      await page.fill('input[type="text"]', 'Luke');
      await page.click('button[type="submit"]');
      
      // Wait for chat to load
      await page.waitForTimeout(3000);
      
      // Take screenshot after login
      await page.screenshot({ path: 'screenshot-2-logged-in.png', fullPage: true });
      console.log('Screenshot saved: screenshot-2-logged-in.png');
      
      // Check if vue-advanced-chat element exists
      const chatElement = await page.$('vue-advanced-chat');
      if (chatElement) {
        console.log('Found vue-advanced-chat element!');
        
        // Get element properties
        const elementInfo = await page.evaluate(() => {
          const el = document.querySelector('vue-advanced-chat');
          return {
            exists: !!el,
            shadowRoot: !!el?.shadowRoot,
            clientHeight: el?.clientHeight,
            clientWidth: el?.clientWidth,
            innerHTML: el?.innerHTML?.substring(0, 200)
          };
        });
        console.log('Element info:', elementInfo);
        
        // Try to click the add room button
        const addButton = await page.$('[aria-label="Add"]');
        if (addButton) {
          console.log('Found add room button, clicking...');
          await addButton.click();
          await page.waitForTimeout(1000);
          
          // Fill in new room form
          const roomInput = await page.$('input[placeholder="Add username"]');
          if (roomInput) {
            await page.fill('input[placeholder="Add username"]', 'Leia');
            await page.click('button:has-text("Create Room")');
            await page.waitForTimeout(2000);
            
            // Take screenshot after creating room
            await page.screenshot({ path: 'screenshot-3-room-created.png', fullPage: true });
            console.log('Screenshot saved: screenshot-3-room-created.png');
          }
        }
      } else {
        console.log('vue-advanced-chat element NOT found!');
        
        // Check what's actually on the page
        const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
        console.log('Page body HTML:', bodyHTML);
      }
    } else {
      console.log('Login form not found!');
    }
    
    // Keep browser open briefly
    console.log('Test completed. Taking final screenshot...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
