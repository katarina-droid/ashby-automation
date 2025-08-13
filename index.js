
I have the following set up
🚀 Ashby automation server running on port 10000
📋 Health check available at /health
🧪 Test Ashby connection at /test-ashby-connection
🔗 Webhook endpoint at /webhook/candidate-submitted
🌐 Your live server URLs:
📋 Health: https://ashby-automation.onrender.com/health
🧪 API Test: https://ashby-automation.onrender.com/test-ashby-connection
🔗 Webhook: https://ashby-automation.onrender.com/webhook/candidate-submitted

I got this error in render 

📝 Application submit webhook received
🔍 Extracted data:
 - candidateId: undefined
 - applicationId: undefined
 - submittingUserId: undefined
❌ Missing required data - candidateId or submittingUserId
Available webhook data keys: [ 'data', 'action', 'webhookActionId' ]
Available data keys: [ 'application' ]

Edit
Looking at your webhook error, the issue is that your code is expecting the candidate data to be at the top level of the webhook payload, but Ashby is actually nesting it under a data.application structure.

The error shows:

Your code is looking for candidateId, applicationId, submittingUserId at the root level
But the actual structure is: { data: { application: { ... } } }
Here's how to fix this. You need to update your webhook handler to access the nested data structure:

javascript
// Instead of:
const candidateId = req.body.candidateId;
const applicationId = req.body.applicationId;
const submittingUserId = req.body.submittingUserId;

// Use:
const application = req.body.data?.application;
const candidateId = application?.candidateId;
const applicationId = application?.id;
const submittingUserId = application?.submittingUserId;

// Or more defensively:
const { data } = req.body;
const application = data?.application;

if (!application) {
  console.log('❌ No application data found');
  return res.status(400).json({ error: 'No application data found' });
}

const candidateId = application.candidateId;
const applicationId = application.id;
const submittingUserId = application.submittingUserId;
To debug further, add this logging to see the exact structure:

javascript
console.log('🔍 Full webhook payload:', JSON.stringify(req.body, null, 2));
console.log('🔍 Application data:', JSON.stringify(req.body.data?.application, null, 2));
The key insight is that Ashby webhooks typically wrap the actual data in a data object, and then the specific resource (like application) is nested within that.

Would you like me to help you update your specific webhook handler code once you share it?






index.js
218 lines

js

yes I can share the code with you

Edit
Looking at your code and the error, I can see the issue. Your webhook is receiving data in this structure:

{
  data: {
    application: { ... }
  },
  action: "applicationSubmit",
  webhookActionId: "..."
}
But your code is looking for candidateId, applicationId, and submittingUserId directly in webhookData.data, when they're actually nested inside webhookData.data.application.

Here's the fix for your webhook handler:


Fixed Webhook Handler
Code 
The key changes I made:

Fixed the data extraction: Instead of looking for data directly in webhookData.data, I now extract the application object first: const application = webhookData.data?.application;
Proper field mapping:
candidateId → application.candidateId
applicationId → application.id (applications typically use id not applicationId)
submittingUserId → application.createdBy?.id
Better error handling: Added checks for the application object existence and more detailed logging
Removed duplicate code: I removed the duplicate data extraction logic that was happening after the applicationSubmit check
Added debug logging: Added a line to log the full application object so you can see exactly what fields are available
Replace your current webhook handler with this fixed version. The main issue was that you were looking one level too shallow in the webhook data structure. Ashby sends the application data nested as data.application, not directly in data.





got this error 
==> Deploying...
==> Running 'node index.js'
/opt/render/project/src/index.js:2
app.post('/webhook/candidate-submitted', async (req, res) => {
^
ReferenceError: app is not defined
 at Object.<anonymous> (/opt/render/project/src/index.js:2:1)
 at Module._compile (node:internal/modules/cjs/loader:1738:14)
 at Object..js (node:internal/modules/cjs/loader:1871:10)
 at Module.load (node:internal/modules/cjs/loader:1470:32)
 at Module._load (node:internal/modules/cjs/loader:1290:12)
 at TracingChannel.traceSync (node:diagnostics_channel:322:14)
 at wrapModuleLoad (node:internal/modules/cjs/loader:238:24)
 at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
 at node:internal/main/run_main_module:33:47
Node.js v24.5.0
==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'node index.js'
/opt/render/project/src/index.js:2
app.post('/webhook/candidate-submitted', async (req, res) => {
^
ReferenceError: app is not defined
 at Object.<anonymous> (/opt/render/project/src/index.js:2:1)
 at Module._compile (node:internal/modules/cjs/loader:1738:14)
 at Object..js (node:internal/modules/cjs/loader:1871:10)
 at Module.load (node:internal/modules/cjs/loader:1470:32)
 at Module._load (node:internal/modules/cjs/loader:1290:12)
 at TracingChannel.traceSync (node:diagnostics_channel:322:14)
 at wrapModuleLoad (node:internal/modules/cjs/loader:238:24)
 at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
 at node:internal/main/run_main_module:33:47
Node.js v24.5.0

Edit
The error shows that app is not defined, which means you only replaced part of your code. You need to replace just the webhook handler function in your existing file, not create a new file.

Looking at your original code, you need to find this section:

javascript
// Main webhook handler
app.post('/webhook/candidate-submitted', async (req, res) => {
  // ... your existing code ...
});
And replace it with the fixed version. Here's what you should do:

Keep all your existing code (the imports, config, other functions, etc.)
Only replace the webhook handler function
Here's the exact section you need to replace in your existing index.js file:


Fixed Webhook Handler
Code ∙ Version 2 
Instructions:

DO NOT create a new file
DO NOT replace your entire index.js
Find this line in your existing index.js:
javascript
// Main webhook handler
app.post('/webhook/candidate-submitted', async (req, res) => {
Replace everything from that line until the matching closing }); with the code from my artifact
Keep everything else the same - your imports, CONFIG, other functions, etc.
The issue happened because you might have created a new file with just the webhook handler, but you need the Express app setup and all the other parts of your original code too.

Would you like me to show you exactly which lines to replace, or do you need me to provide the complete corrected file?





==> Running 'node index.js'
/opt/render/project/src/index.js:2
app.post('/webhook/candidate-submitted', async (req, res) => {
^
ReferenceError: app is not defined
 at Object.<anonymous> (/opt/render/project/src/index.js:2:1)
 at Module._compile (node:internal/modules/cjs/loader:1738:14)
 at Object..js (node:internal/modules/cjs/loader:1871:10)
 at Module.load (node:internal/modules/cjs/loader:1470:32)
 at Module._load (node:internal/modules/cjs/loader:1290:12)
 at TracingChannel.traceSync (node:diagnostics_channel:322:14)
 at wrapModuleLoad (node:internal/modules/cjs/loader:238:24)
 at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
 at node:internal/main/run_main_module:33:47
Node.js v24.5.0

Edit
I see the issue! The error shows that line 2 of your index.js file starts with app.post('/webhook/candidate-submitted', which means you accidentally replaced your entire file with just the webhook handler function, removing all the setup code.

You need to restore your complete original file. Let me provide the full corrected version:


Complete Fixed index.js
Code ∙ Version 3 
Copy this complete file and replace your entire index.js file with this version.

This includes:

✅ All your original setup code (Express, config, API functions, etc.)
✅ All your original endpoints (/, /health, /test-ashby-connection)
✅ The fixed webhook handler that properly extracts data from webhookData.data.application
✅ All your original helper functions
The key fix is in the webhook handler where I changed:

❌ webhookData.data?.candidateId
✅ webhookData.data?.application?.candidateId
This should resolve both the "app is not defined" error and the original data extraction issue.




Im still getting this error
❌ Missing required data - candidateId or submittingUserId

Edit
Let me help you debug this by adding more detailed logging to see exactly what data structure Ashby is sending. The issue is that we're still not extracting the data from the correct location.


Fixed Webhook Handler
Code ∙ Version 4 
I've added much more detailed debugging to help us see exactly what structure Ashby is sending. This updated code will:

Show the exact structure of the webhook data
Try multiple possible locations for the application data
Check alternative field names that Ashby might be using
Log each step so we can see what's happening
Deploy this updated version and when you receive the next webhook, check the logs. You should see detailed output showing:

The exact keys in the webhook data
What's inside webhookData.data
The full application object structure
All the field names being tried
Once we see this debug output, I'll be able to tell you exactly which field names Ashby is using and we can fix the extraction logic accordingly.

Can you deploy this and then trigger a test webhook from Ashby? The logs will show us exactly what we're working with.





2025-08-13T13:10:11.479529755Z ==> Deploying... 2025-08-13T13:10:29.823923671Z ==> Running 'node index.js' 2025-08-13T13:10:31.125309039Z 🚀 Ashby automation server running on port 10000 2025-08-13T13:10:31.125506133Z 📋 Health check available at /health 2025-08-13T13:10:31.125514613Z 🧪 Test Ashby

pasted

Edit
Perfect! Now I can see exactly what's happening. The debug output shows us the correct field names:

candidateId should be application.candidate.id (not application.candidateId)
submittingUserId should be application.creditedToUser.id (not application.createdBy.id)
I can see from the logs that:

application.candidate.id = "2c30ffaf-850e-41dc-abe2-8803ecf60b6c" ✅
application.creditedToUser.id = "7a2e64b3-66b1-4276-a4c8-dc9767be3d7f" ✅
The user has globalRole: "External Recruiter" ✅
Here's the fix:


Fixed Webhook Handler
Code ∙ Version 5 
Also, I need to update the role checking function since Ashby is sending globalRole instead of role:


Fixed Webhook Handler
Code ∙ Version 6 
Perfect! Now I can see exactly what was wrong:

candidateId was looking for application.candidateId but it's actually application.candidate.id
submittingUserId was looking for application.createdBy.id but it's actually application.creditedToUser.id
User role was checking user.role but Ashby sends it as user.globalRole
The fixed version now correctly extracts:

candidateId from application.candidate.id
submittingUserId from application.creditedToUser.id
And checks both globalRole and role fields for the External Recruiter check
Deploy this updated version and it should work correctly! The webhook should now successfully:

✅ Extract the candidate ID and user ID correctly
✅ Identify that the user is an "External Recruiter"
✅ Proceed with creating and assigning the feedback form



❌ Missing required data - candidateId or submittingUserId
❌ candidateId found: false
❌ submittingUserId found: false
🔍 Trying alternative field names:
 - application.candidate?.id: f387a28a-56e5-4cfa-bdaf-e46a4625bb5e
 - application.candidateUuid: undefined
 - application.author?.id: undefined
 - application.createdBy: undefined
 - application.userId: undefined

Edit
I see the issue! The old debugging code is still running even though I updated the extraction logic. The new code is correctly finding the candidate ID (f387a28a-56e5-4cfa-bdaf-e46a4625bb5e), but the old debugging code is still executing and causing the error.

Let me remove all the old debugging code and use the clean, fixed version:


Fixed Webhook Handler
Code ∙ Version 7 
Now deploy this cleaned-up version. The issue was that there were conflicting variable declarations and old debugging code that was still running. This clean version should work correctly because:

✅ It extracts candidateId from application.candidate.id
✅ It extracts submittingUserId from application.creditedToUser.id
✅ No more conflicting debugging code
✅ Clean, simple extraction logic
The webhook should now successfully process and assign the feedback form to the External Recruiter!







// Ashby Feedback Form Automation Server
// This server listens for candidate submissions and automatically assigns feedback forms

const express = require('express');
const axios = require('axios');
const app = express();

// Configuration - Replace these with your actual values
const CONFIG = {
  ASHBY_API_KEY: 'aff8a31f412d6757f033ba7d074d5d5d035ce0a1470a1481db4772bc7040082e',
  FEEDBACK_FORM_ID: 'cabd51a2-17a7-4e30-a5e1-f35f5dbd15ae', // The ID of your prepared form
  PORT: process.env.PORT || 3000,
  WEBHOOK_SECRET: 'your-webhook-secret' // Optional but recommended
};

// Middleware to parse JSON
app.use(express.json());

// Helper function to call Ashby API
async function callAshbyAPI(endpoint, data) {
  try {
    const response = await axios.post(`https://api.ashbyhq.com/${endpoint}`, data, {
      headers: {
        'Authorization': `Basic ${Buffer.from(CONFIG.ASHBY_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Ashby API Error for ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Check if user is from recruiting agency
function isRecruitingAgency(user) {
  // Check if user role is "External Recruiter"
  console.log(`👤 Checking user: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`📋 User globalRole: "${user.globalRole}"`);
  console.log(`📋 User role: "${user.role}"`);
  
  // Check both globalRole and role fields since Ashby might use either
  const isExternalRecruiter = user.globalRole === 'External Recruiter' || user.role === 'External Recruiter';
  console.log(`✅ Is External Recruiter: ${isExternalRecruiter}`);
  
  return isExternalRecruiter;
}

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>Ashby Automation Server</h1>
    <p>Server is running! ✅</p>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/test-ashby-connection">Test Ashby Connection</a></li>
      <li><a href="/webhook/candidate-submitted">Webhook Endpoint (GET test)</a></li>
    </ul>
    <p><strong>Webhook URL for Ashby:</strong> <code>${req.protocol}://${req.get('host')}/webhook/candidate-submitted</code></p>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is running!');
});

// Test endpoint to verify API connectivity
app.get('/test-ashby-connection', async (req, res) => {
  try {
    const response = await callAshbyAPI('user.list', { limit: 1 });
    res.status(200).json({ status: 'success', message: 'Ashby API connection working!', userCount: response.results?.length || 0 });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ashby API connection failed', error: error.message });
  }
});

// Handle GET requests to webhook endpoint (for testing)
app.get('/webhook/candidate-submitted', (req, res) => {
  console.log('🔍 GET request received at webhook endpoint');
  res.status(200).send('Webhook endpoint is ready! Use POST requests to send webhook data.');
});

// Main webhook handler - FIXED VERSION
app.post('/webhook/candidate-submitted', async (req, res) => {
  try {
    console.log('📝 Webhook POST request received!');
    console.log('📝 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 Body:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // Handle Ashby test/ping webhooks
    if (webhookData.type === 'ping' || webhookData.ping) {
      console.log('✅ Ping/test webhook received - responding with success');
      return res.status(200).send('Webhook endpoint is working! Ping received successfully.');
    }
    
    // Handle applicationSubmit webhooks
    if (webhookData.action === 'applicationSubmit') {
      console.log('📝 Application submit webhook received');
      
      // DEBUG: Let's see the exact structure
      console.log('🔍 DEBUGGING webhook structure:');
      console.log('  - webhookData keys:', Object.keys(webhookData));
      console.log('  - webhookData.data keys:', webhookData.data ? Object.keys(webhookData.data) : 'no data object');
      console.log('  - Full webhookData.data:', JSON.stringify(webhookData.data, null, 2));
      
      // Try multiple possible locations for the application data
      let application = null;
      let candidateId = null;
      let applicationId = null;
      let submittingUserId = null;
      
      // Check different possible structures
      if (webhookData.data?.application) {
        console.log('✅ Found application in webhookData.data.application');
        application = webhookData.data.application;
        candidateId = application.candidateId;
        applicationId = application.id;
        submittingUserId = application.createdBy?.id || application.submittingUserId;
      } else if (webhookData.data) {
        console.log('✅ Checking if data IS the application');
        application = webhookData.data;
        candidateId = application.candidateId;
        applicationId = application.id || application.applicationId;
        submittingUserId = application.createdBy?.id || application.submittingUserId;
      } else {
        console.log('❌ No application data found in expected locations');
        return res.status(200).send('Webhook received but no application data found');
      }
      
      console.log('🔍 Extracted data:');
      console.log('  - candidateId:', candidateId);
      console.log('  - applicationId:', applicationId);
      console.log('  - submittingUserId:', submittingUserId);
      console.log('🔍 Application object keys:', Object.keys(application));
      console.log('🔍 Full application object:', JSON.stringify(application, null, 2));
      
      if (!candidateId || !submittingUserId) {
        console.log('❌ Missing required data - candidateId or submittingUserId');
        console.log('❌ candidateId found:', !!candidateId);
        console.log('❌ submittingUserId found:', !!submittingUserId);
        
        // Try alternative field names
        const altCandidateId = application.candidate?.id || application.candidateUuid;
        const altSubmittingUserId = application.author?.id || application.createdBy || application.userId;
        
        console.log('🔍 Trying alternative field names:');
        console.log('  - application.candidate?.id:', altCandidateId);
        console.log('  - application.candidateUuid:', application.candidateUuid);
        console.log('  - application.author?.id:', application.author?.id);
        console.log('  - application.createdBy:', application.createdBy);
        console.log('  - application.userId:', application.userId);
        
        if (altCandidateId) candidateId = altCandidateId;
        if (altSubmittingUserId) submittingUserId = altSubmittingUserId;
        
        if (!candidateId || !submittingUserId) {
          return res.status(200).send('Webhook received but missing expected data fields');
        }
      }
      
      console.log('✅ Required data found, proceeding with automation...');
      
      // Get user information to check if they're from recruiting agency
      const userResponse = await callAshbyAPI('user.info', {
        userId: submittingUserId
      });
      
      const user = userResponse.results;
      
      // Check if this is a recruiting agency user
      if (!isRecruitingAgency(user)) {
        console.log('User is not from recruiting agency, skipping form assignment');
        return res.status(200).send('Not a recruiting agency user');
      }

      // Get candidate information for the notification
      const candidateResponse = await callAshbyAPI('candidate.info', {
        candidateId: candidateId
      });
      
      const candidate = candidateResponse.results;

      // Assign feedback form to the recruiting agency user
      const feedbackFormResponse = await callAshbyAPI('feedbackForm.create', {
        candidateId: candidateId,
        feedbackFormDefinitionId: CONFIG.FEEDBACK_FORM_ID,
        assignedToUserId: submittingUserId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });

      console.log('✅ Feedback form assigned successfully:', feedbackFormResponse);

      // Send notification email
      await sendNotificationEmail(user, candidate, feedbackFormResponse.results);

      return res.status(200).send('Feedback form assigned successfully');
      
    } else {
      console.log('❓ Unknown webhook action:', webhookData.action);
      return res.status(200).send('Webhook received but unknown action type');
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal server error');
  }
});

// Function to send notification email
async function sendNotificationEmail(user, candidate, feedbackForm) {
  // This is a placeholder - you'll need to implement your preferred email method
  // Options:
  // 1. Use Ashby's built-in notifications
  // 2. Use an email service like SendGrid, Mailgun, or Amazon SES
  // 3. Use Zapier to send the email
  
  console.log(`
    EMAIL NOTIFICATION:
    To: ${user.email}
    Subject: Please complete feedback form for ${candidate.name}
    
    Hi ${user.firstName},
    
    Please complete the feedback form for candidate: ${candidate.name}
    
    You can access the form directly in Ashby.
    Due date: ${new Date(feedbackForm.dueDate).toLocaleDateString()}
    
    Thank you!
  `);
  
  // TODO: Implement actual email sending
}

// Start the server
app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`🚀 Ashby automation server running on port ${CONFIG.PORT}`);
  console.log(`📋 Health check available at /health`);
  console.log(`🧪 Test Ashby connection at /test-ashby-connection`);
  console.log(`🔗 Webhook endpoint at /webhook/candidate-submitted`);
  console.log('');
  console.log('🌐 Your live server URLs:');
  console.log(`📋 Health: https://ashby-automation.onrender.com/health`);
  console.log(`🧪 API Test: https://ashby-automation.onrender.com/test-ashby-connection`);
  console.log(`🔗 Webhook: https://ashby-automation.onrender.com/webhook/candidate-submitted`);
  console.log('');
  console.log('✅ Ready for webhook requests from Ashby!');
});
