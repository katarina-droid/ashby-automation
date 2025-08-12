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
      
      // FIXED: Extract data from the correct nested structure
      const application = webhookData.data?.application;
      
      if (!application) {
        console.log('❌ No application data found in webhook');
        console.log('Available webhook data keys:', Object.keys(webhookData));
        if (webhookData.data) {
          console.log('Available data keys:', Object.keys(webhookData.data));
        }
        return res.status(200).send('Webhook received but no application data found');
      }
      
      // Extract the actual fields from the application object
      const candidateId = application.candidateId;
      const applicationId = application.id; // Note: application ID is usually just 'id'
      const submittingUserId = application.createdBy?.id || application.submittingUserId;
      
      console.log('🔍 Extracted data:');
      console.log('  - candidateId:', candidateId);
      console.log('  - applicationId:', applicationId);
      console.log('  - submittingUserId:', submittingUserId);
      console.log('🔍 Full application object:', JSON.stringify(application, null, 2));
      
      if (!candidateId || !submittingUserId) {
        console.log('❌ Missing required data - candidateId or submittingUserId');
        console.log('Available application keys:', Object.keys(application));
        return res.status(200).send('Webhook received but missing expected data fields');
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
