# MSG91 SMS Integration Setup Guide

This guide will help you set up MSG91 for sending SMS and OTP in the Concreexpo application.

## Why MSG91?

- **Cost-Effective**: Much cheaper than Twilio for Indian SMS (₹0.15 - ₹0.25 per SMS)
- **High Delivery Rate**: 98%+ delivery rate in India
- **DND Compliant**: Fully compliant with TRAI regulations
- **OTP Templates**: Pre-approved templates for instant delivery
- **No Setup Fee**: Pay-as-you-go model

## Prerequisites

1. Valid Indian business/company registration
2. Active mobile number for verification
3. Business email address

## Step 1: Create MSG91 Account

1. Go to [https://msg91.com/](https://msg91.com/)
2. Click **"Sign Up"** button
3. Fill in your details:
   - Full Name
   - Email Address
   - Mobile Number
   - Company Name
   - Password
4. Verify your email and mobile number
5. Complete KYC (Know Your Customer) verification:
   - Upload business documents (GST certificate, company registration, etc.)
   - Verification usually takes 1-2 business days

## Step 2: Get Authentication Key

1. Log in to MSG91 dashboard
2. Go to **"Settings"** → **"API Keys"**
3. Copy your **Authentication Key** (Auth Key)
4. Keep this key secure - you'll need it for configuration

## Step 3: Configure Sender ID

A Sender ID is the name that appears as the sender of the SMS (e.g., "CNCEXP" for Concreexpo).

1. In MSG91 dashboard, go to **"Sender ID"**
2. Click **"Add New Sender ID"**
3. Enter your desired Sender ID:
   - **Recommended**: `CNCEXP` (for Concreexpo)
   - Must be 6 characters, alphanumeric
   - Cannot contain special characters
4. Select **Service Type**: "Transactional"
5. Upload required documents for verification
6. Wait for approval (usually 1-2 days)

**Note**: Until your Sender ID is approved, you can use the default test Sender ID for development.

## Step 4: Create SMS Templates (Optional but Recommended)

Templates improve delivery rates and reduce spam filtering.

### For OTP Messages:

1. Go to **"Templates"** in MSG91 dashboard
2. Click **"Create New Template"**
3. Choose **"OTP"** template type
4. Create template with this format:

```
Your OTP for Concreexpo is ##OTP##. Valid for ##VALIDITY## minutes. Do not share with anyone. - Concreexpo
```

5. Variables:
   - `##OTP##` - Will be replaced with actual OTP
   - `##VALIDITY##` - Validity period
6. Submit for approval (usually instant for standard OTP format)
7. Note down the **Template ID** once approved

### For Appointment Notifications:

```
Appointment scheduled with ##ENGINEER## on ##DATE## at ##TIME##. Location: ##LOCATION##. You will receive OTP after visit. - Concreexpo
```

### For Worker Count Verification:

```
Worker count verification for ##SITE## on ##DATE##. Your OTP is ##OTP##. Valid for 24 hours. - Concreexpo
```

## Step 5: Configure Application

### Update `.env` file:

```bash
# SMS Gateway (MSG91)
SMS_PROVIDER="msg91"
MSG91_AUTH_KEY="your_actual_auth_key_from_msg91_dashboard"
MSG91_SENDER_ID="CNCEXP"
MSG91_ROUTE="4"

# Optional: Add template IDs for better delivery
MSG91_TEMPLATE_ID="your_general_sms_template_id"
MSG91_OTP_TEMPLATE_ID="your_otp_template_id"
```

### Configuration Parameters Explained:

- **MSG91_AUTH_KEY**: Your authentication key from MSG91 dashboard
- **MSG91_SENDER_ID**: Your approved Sender ID (default: "CNCEXP")
- **MSG91_ROUTE**: SMS route type
  - `4` = Transactional (recommended) - High priority, instant delivery
  - `1` = Promotional - Lower priority, cheaper
- **MSG91_TEMPLATE_ID**: (Optional) General SMS template ID
- **MSG91_OTP_TEMPLATE_ID**: (Optional) OTP template ID for better delivery

## Step 6: Test SMS Functionality

### Option 1: Using the Test Script

Create a file `test-sms.ts` in the backend folder:

```typescript
import { sendSMS } from './src/services/sms.service';

async function testSMS() {
  console.log('Testing MSG91 SMS...');

  const result = await sendSMS({
    to: '+919876543210', // Replace with your test number
    message: 'Test message from Concreexpo. MSG91 integration is working!',
  });

  if (result) {
    console.log('✅ SMS sent successfully!');
  } else {
    console.log('❌ SMS sending failed. Check logs.');
  }
}

testSMS();
```

Run the test:
```bash
cd backend
npx ts-node test-sms.ts
```

### Option 2: Using API Endpoint

Start your backend server and use this curl command:

```bash
# Create an appointment (which triggers SMS)
curl -X POST http://localhost:3001/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "clientId": "CLIENT_ID",
    "engineerId": "ENGINEER_ID",
    "visitDate": "2024-12-01",
    "purpose": "Site inspection"
  }'
```

## Step 7: Monitor SMS Delivery

### Check MSG91 Dashboard:

1. Go to **"Reports"** → **"SMS Logs"**
2. View delivery status for each SMS:
   - **Sent**: Message delivered to operator
   - **Delivered**: Message delivered to recipient
   - **Failed**: Delivery failed (check reason)
   - **Rejected**: Message rejected (usually due to DND)

### Check Application Logs:

SMS logs are stored in the database (`sms_logs` table):

```sql
SELECT * FROM sms_logs
ORDER BY sent_at DESC
LIMIT 10;
```

### Using the Balance Check Function:

The application includes a balance check function:

```typescript
import { checkMSG91Balance } from './src/services/sms.service';

const balance = await checkMSG91Balance();
console.log('MSG91 Balance:', balance);
```

## Pricing Information

### MSG91 Pricing (as of 2024):

- **Transactional SMS** (Route 4): ₹0.20 - ₹0.25 per SMS
- **OTP SMS**: ₹0.15 - ₹0.20 per OTP
- **Promotional SMS**: ₹0.10 - ₹0.15 per SMS

### Cost Comparison with Twilio:

- **Twilio India SMS**: $0.0035 USD (~₹0.30) per SMS
- **MSG91**: ₹0.20 per SMS
- **Savings**: ~33% cheaper + no currency conversion fees

### Recommended Recharge:

- For testing: ₹500 (covers ~2,500 SMS)
- For production: ₹5,000+ (covers ~25,000+ SMS)

## Troubleshooting

### Issue 1: SMS Not Sending

**Check:**
1. Verify AUTH_KEY is correct
2. Check MSG91 account balance
3. Verify Sender ID is approved
4. Check phone number format (should be +91XXXXXXXXXX)

**Solution:**
```bash
# Check logs in database
SELECT * FROM sms_logs WHERE status = 'failed' ORDER BY sent_at DESC LIMIT 5;
```

### Issue 2: OTP Not Delivered

**Possible Causes:**
1. Recipient's number on DND (Do Not Disturb) list
2. Template not approved
3. Insufficient balance

**Solution:**
- Use approved OTP template ID
- For DND numbers, get explicit consent
- Recharge account if balance is low

### Issue 3: "Invalid Authkey" Error

**Cause:** Incorrect or expired authentication key

**Solution:**
1. Log in to MSG91 dashboard
2. Go to Settings → API Keys
3. Copy the correct auth key
4. Update `.env` file with new key
5. Restart the backend server

### Issue 4: "Sender ID Not Approved" Error

**Cause:** Using unapproved Sender ID

**Solution:**
- Use default Sender ID for testing: `TESTNG`
- Wait for your custom Sender ID approval
- Or use pre-approved template with registered Sender ID

## Best Practices

1. **Use Templates**: Pre-approved templates have better delivery rates
2. **Monitor Balance**: Set up low-balance alerts in MSG91 dashboard
3. **Test Phone Numbers**: Use test numbers during development
4. **Respect DND**: Don't send promotional SMS to DND numbers
5. **Log Everything**: Keep SMS logs for auditing and debugging
6. **Rate Limiting**: Implement rate limiting to prevent abuse
7. **Retry Logic**: Implement exponential backoff for failed messages

## Support

### MSG91 Support:
- **Email**: support@msg91.com
- **Phone**: +91-9650670202
- **Live Chat**: Available on dashboard
- **Documentation**: [https://docs.msg91.com/](https://docs.msg91.com/)

### Application Support:
- Check backend logs: `backend/logs/`
- Check database logs: `sms_logs` table
- Review error messages in console

## Additional Features

### 1. Check SMS Delivery Status

```typescript
// The application automatically logs delivery status
// Check the SMS logs table for status updates
```

### 2. SMS Analytics

MSG91 dashboard provides:
- Delivery reports
- Failed message analysis
- Cost analytics
- Usage trends

### 3. International SMS

To send SMS outside India:
1. Enable international SMS in MSG91 dashboard
2. Update country code in SMS service
3. Pricing will vary by country

## Migration from Twilio

If you're migrating from Twilio:

1. ✅ All SMS functions remain the same
2. ✅ No changes needed in application code
3. ✅ Only configuration changes required
4. ✅ SMS logs continue to work
5. ✅ All OTP logic intact

The migration is complete! Your application will now use MSG91 for all SMS/OTP functionality.

## Quick Start Checklist

- [ ] Created MSG91 account
- [ ] Completed KYC verification
- [ ] Got authentication key
- [ ] Registered Sender ID
- [ ] Created OTP template (optional)
- [ ] Recharged account (₹500+ for testing)
- [ ] Updated `.env` file
- [ ] Restarted backend server
- [ ] Tested SMS sending
- [ ] Verified SMS delivery

---

**Note**: Keep your MSG91 auth key secure. Never commit it to version control. Always use environment variables.
