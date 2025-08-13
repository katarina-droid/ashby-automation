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
