import React from 'react';
import './TermsAndConditions.css';

const TermsAndConditions = () => {
  return (
    <div className="terms-container">
      <div className="terms-content">
        <h1>Terms and Conditions</h1>
        
        <div className="last-updated">
          <strong>Last Updated:</strong> January 15, 2025
        </div>

        <h2>1. Acceptance of Terms</h2>
        <p>Welcome to MYVYTEX ("we," "our," "us," or "the Company"). These Terms and Conditions ("Terms") govern your use of our creator platform that provides BioLink creation, campaign management, UGC content handling, automation tools, and collaboration features.</p>
        
        <p>By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our services.</p>

        <h2>2. Description of Service</h2>
        <p>MYVYTEX is a comprehensive creator platform that offers:</p>
        <ul>
          <li><strong>BioLink Creator:</strong> Build and customize link pages for social media profiles</li>
          <li><strong>Campaign Manager:</strong> Launch and track marketing campaigns with automation</li>
          <li><strong>UGC Hub:</strong> Collect and showcase user-generated content</li>
          <li><strong>Automation Studio:</strong> Create workflows to streamline creator tasks</li>
          <li><strong>Collaboration Tools:</strong> Connect creators with brands and partners</li>
          <li><strong>Analytics Dashboard:</strong> Track performance and engagement metrics</li>
        </ul>

        <h2>3. Facebook/Instagram Integration</h2>
        
        <h3>3.1 Platform Integration</h3>
        <p>Our service integrates with Facebook and Instagram through their official APIs to provide enhanced functionality. By using these integrations, you agree to:</p>
        <ul>
          <li>Comply with Facebook's Terms of Service and Platform Policy</li>
          <li>Comply with Instagram's Terms of Use and Community Guidelines</li>
          <li>Grant us necessary permissions to access your social media data</li>
          <li>Understand that Facebook/Instagram data usage is subject to their policies</li>
        </ul>

        <h3>3.2 Data Usage Compliance</h3>
        <div className="important-box">
          <p><strong>Important:</strong> We use Facebook/Instagram data solely to provide our platform services. We do not:</p>
          <ul>
            <li>Sell or monetize your social media data</li>
            <li>Use your data for advertising outside our platform</li>
            <li>Share your social media data with third parties</li>
            <li>Retain data longer than necessary for our services</li>
          </ul>
        </div>

        <h2>4. User Accounts and Registration</h2>
        
        <h3>4.1 Account Creation</h3>
        <ul>
          <li>You must provide accurate and complete information during registration</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You must be at least 13 years old to create an account</li>
          <li>One person may not maintain multiple accounts</li>
        </ul>

        <h3>4.2 Account Responsibilities</h3>
        <ul>
          <li>Keep your login credentials secure and confidential</li>
          <li>Notify us immediately of any unauthorized use</li>
          <li>Update your information when it changes</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>

        <h2>5. Acceptable Use Policy</h2>
        
        <h3>5.1 Permitted Uses</h3>
        <p>You may use our services to:</p>
        <ul>
          <li>Create and manage BioLink pages for legitimate purposes</li>
          <li>Run marketing campaigns for your business or brand</li>
          <li>Collect and showcase UGC content with proper permissions</li>
          <li>Automate workflows to improve efficiency</li>
          <li>Collaborate with other creators and brands</li>
        </ul>

        <h3>5.2 Prohibited Uses</h3>
        <div className="warning-box">
          <p><strong>You may NOT use our services to:</strong></p>
          <ul>
            <li className="prohibited">Violate any applicable laws or regulations</li>
            <li className="prohibited">Infringe on intellectual property rights</li>
            <li className="prohibited">Distribute malware, viruses, or harmful code</li>
            <li className="prohibited">Engage in spam, phishing, or fraudulent activities</li>
            <li className="prohibited">Harass, abuse, or harm others</li>
            <li className="prohibited">Create fake accounts or impersonate others</li>
            <li className="prohibited">Circumvent security measures or access controls</li>
            <li className="prohibited">Use automated tools to abuse our services</li>
            <li className="prohibited">Violate Facebook's or Instagram's terms of service</li>
            <li className="prohibited">Collect data without proper consent</li>
          </ul>
        </div>

        <h2>6. Content and Intellectual Property</h2>
        
        <h3>6.1 Your Content</h3>
        <ul>
          <li>You retain ownership of content you create and upload</li>
          <li>You grant us a license to use your content to provide our services</li>
          <li>You are responsible for ensuring you have rights to all content you upload</li>
          <li>You must obtain proper permissions for UGC content</li>
        </ul>

        <h3>6.2 Our Content</h3>
        <ul>
          <li>Our platform, software, and designs are protected by intellectual property laws</li>
          <li>You may not copy, modify, or distribute our proprietary content</li>
          <li>Our trademarks and logos may not be used without permission</li>
        </ul>

        <h2>7. Payment Terms</h2>
        
        <h3>7.1 Subscription Plans</h3>
        <ul>
          <li>We offer various subscription plans with different features</li>
          <li>Prices are subject to change with 30 days' notice</li>
          <li>Subscriptions auto-renew unless cancelled</li>
          <li>Payment is due in advance for each billing period</li>
        </ul>

        <h3>7.2 Refunds and Cancellations</h3>
        <ul>
          <li>You may cancel your subscription at any time</li>
          <li>Refunds are provided according to our refund policy</li>
          <li>Cancellation takes effect at the end of the current billing period</li>
          <li>No refunds for partial periods</li>
        </ul>

        <h2>8. Privacy and Data Protection</h2>
        <p>Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. Key points include:</p>
        <ul>
          <li>We collect only necessary information to provide our services</li>
          <li>We implement appropriate security measures to protect your data</li>
          <li>We comply with applicable data protection laws (GDPR, CCPA, etc.)</li>
          <li>You have rights regarding your personal data</li>
        </ul>

        <h2>9. Service Availability and Modifications</h2>
        
        <h3>9.1 Service Availability</h3>
        <ul>
          <li>We strive to maintain high service availability but cannot guarantee 100% uptime</li>
          <li>We may perform scheduled maintenance with advance notice</li>
          <li>We are not liable for service interruptions beyond our control</li>
        </ul>

        <h3>9.2 Service Modifications</h3>
        <ul>
          <li>We may modify, suspend, or discontinue features with notice</li>
          <li>We will provide reasonable notice for significant changes</li>
          <li>We may update these Terms from time to time</li>
        </ul>

        <h2>10. Limitation of Liability</h2>
        <div className="warning-box">
          <p><strong>Important Legal Notice:</strong></p>
          <ul>
            <li>Our services are provided "as is" without warranties</li>
            <li>We are not liable for indirect, incidental, or consequential damages</li>
            <li>Our total liability is limited to the amount you paid for our services</li>
            <li>We are not responsible for third-party services or integrations</li>
            <li>You use our services at your own risk</li>
          </ul>
        </div>

        <h2>11. Indemnification</h2>
        <p>You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from:</p>
        <ul>
          <li>Your use of our services</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Your violation of applicable laws</li>
        </ul>

        <h2>12. Termination</h2>
        
        <h3>12.1 Termination by You</h3>
        <ul>
          <li>You may terminate your account at any time</li>
          <li>Termination takes effect immediately</li>
          <li>You may export your data before termination</li>
        </ul>

        <h3>12.2 Termination by Us</h3>
        <ul>
          <li>We may terminate accounts that violate these Terms</li>
          <li>We may suspend accounts pending investigation</li>
          <li>We will provide notice when reasonably possible</li>
        </ul>

        <h2>13. Dispute Resolution</h2>
        
        <h3>13.1 Governing Law</h3>
        <p>These Terms are governed by the laws of India, without regard to conflict of law principles.</p>

        <h3>13.2 Dispute Resolution Process</h3>
        <ul>
          <li>We encourage resolving disputes through direct communication</li>
          <li>If informal resolution fails, disputes may be subject to binding arbitration</li>
          <li>Class action waivers may apply as permitted by law</li>
        </ul>

        <h2>14. Facebook/Instagram Compliance</h2>
        
        <h3>14.1 Platform Policy Compliance</h3>
        <p>Our integration with Facebook and Instagram is subject to their policies:</p>
        <ul>
          <li>We comply with Facebook's Platform Policy and Instagram's Terms of Use</li>
          <li>We maintain appropriate data protection measures</li>
          <li>We provide clear information about data usage</li>
          <li>We enable user control over permissions and data</li>
        </ul>

        <h3>14.2 Third-Party Service Dependencies</h3>
        <ul>
          <li>Our Facebook/Instagram features depend on their API availability</li>
          <li>Changes to their policies may affect our services</li>
          <li>We will notify users of significant changes</li>
        </ul>

        <h2>15. Miscellaneous</h2>
        
        <h3>15.1 Entire Agreement</h3>
        <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and us.</p>

        <h3>15.2 Severability</h3>
        <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in effect.</p>

        <h3>15.3 Waiver</h3>
        <p>Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.</p>

        <h2>16. Contact Information</h2>
        <div className="contact-info">
          <p>If you have any questions about these Terms and Conditions, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> ggs699000@gmail.com</li>
            <li><strong>Support:</strong> ggs699000@gmail.com</li>
            <li><strong>Phone:</strong> +91 8141166187</li>
            <li><strong>Business Name:</strong> MYVYTEX</li>
          </ul>
          
          <p><strong>For Facebook/Instagram Integration Issues:</strong> ggs699000@gmail.com</p>
        </div>

        <h2>17. Updates to Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of material changes by:</p>
        <ul>
          <li>Posting the updated Terms on our website</li>
          <li>Sending email notifications for significant changes</li>
          <li>Providing in-app notifications</li>
        </ul>
        
        <p>Your continued use of our services after changes become effective constitutes acceptance of the new Terms.</p>

        <p><em>These Terms and Conditions are effective as of the date listed above and will remain in effect until modified or terminated.</em></p>
      </div>
    </div>
  );
};

export default TermsAndConditions;
