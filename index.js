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

// Main webhook handler
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
      
      // Extract data from the correct nested structure
      const application = webhookData.data.application;
      
      if (!application) {
        console.log('❌ No application data found in webhook');
        return res.status(200).send('Webhook received but no application data found');
      }
      
      // Use the correct field names based on Ashby's actual webhook structure
      const candidateId = application.candidate.id;  // candidateId is nested in candidate object
      const applicationId = application.id;
      const submittingUserId = application.creditedToUser.id;  // submittingUserId is in creditedToUser object
      
      console.log('🔍 Extracted data:');
      console.log('  - candidateId:', candidateId);
      console.log('  - applicationId:', applicationId);
      console.log('  - submittingUserId:', submittingUserId);
      
      if (!candidateId || !submittingUserId) {
        console.log('❌ Missing required data - candidateId or submittingUserId');
        return res.status(200).send('Webhook received but missing expected data fields');
      }
      
      console.log('✅ Required data found, proceeding with automation...');
      
      // Get user information to check if they're from recruiting agency
      console.log('🔍 Calling user.info API with userId:', submittingUserId);
      let userResponse;
      try {
        userResponse = await callAshbyAPI('user.info', {
          userId: submittingUserId
        });
        console.log('✅ User info retrieved successfully');
      } catch (error) {
        console.error('❌ Failed to get user info:', error.response?.data || error.message);
        return res.status(200).send('Failed to get user information from Ashby');
      }
      
      const user = userResponse.results;
      
      // Check if this is a recruiting agency user
      if (!isRecruitingAgency(user)) {
        console.log('User is not from recruiting agency, skipping form assignment');
        return res.status(200).send('Not a recruiting agency user');
      }

      // Get candidate information for the notification
      console.log('🔍 Calling candidate.info API with candidateId:', candidateId);
      let candidateResponse;
      try {
        candidateResponse = await callAshbyAPI('candidate.info', {
          candidateId: candidateId
        });
        console.log('✅ Candidate info retrieved successfully');
      } catch (error) {
        console.error('❌ Failed to get candidate info:', error.response?.data || error.message);
        return res.status(200).send('Failed to get candidate information from Ashby');
      }
      
      const candidate = candidateResponse.results;

      // Assign feedback form to the recruiting agency user
      console.log('🔍 Calling feedbackForm.create API...');
      console.log('  - candidateId:', candidateId);
      console.log('  - feedbackFormDefinitionId:', CONFIG.FEEDBACK_FORM_ID);
      console.log('  - assignedToUserId:', submittingUserId);
      
      let feedbackFormResponse;
      try {
        feedbackFormResponse = await callAshbyAPI('feedbackForm.create', {
          candidateId: candidateId,
          feedbackFormDefinitionId: CONFIG.FEEDBACK_FORM_ID,
          assignedToUserId: submittingUserId,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        });
        console.log('✅ Feedback form assigned successfully:', feedbackFormResponse);
      } catch (error) {
        console.error('❌ Failed to create feedback form:', error.response?.data || error.message);
        return res.status(200).send('Failed to create feedback form in Ashby');
      }

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
