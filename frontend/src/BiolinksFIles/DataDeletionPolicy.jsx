import React from 'react';
import './DataDeletionPolicy.css';

const DataDeletionPolicy = () => {
  return (
    <div className="data-deletion-container">
      <div className="data-deletion-content">
        <h1>Data Deletion Policy</h1>
        
        <div className="last-updated">
          <strong>Last Updated:</strong> January 15, 2025
        </div>

        <h2>1. Introduction</h2>
        <p>This Data Deletion Policy explains how MYVYTEX handles data deletion requests, particularly in compliance with Facebook's Platform Policy and Instagram Graph API requirements. We are committed to protecting your privacy and providing you with control over your personal data.</p>
        
        <p>This policy covers data deletion for both our platform data and data obtained through Facebook/Instagram integrations.</p>

        <h2>2. Your Right to Data Deletion</h2>
        <p>You have the right to request deletion of your personal data in the following circumstances:</p>
        <ul>
          <li>When you delete your MYVYTEX account</li>
          <li>When you revoke Facebook/Instagram permissions</li>
          <li>When you request specific data deletion</li>
          <li>When required by applicable data protection laws (GDPR, CCPA, etc.)</li>
        </ul>

        <h2>3. Types of Data We Delete</h2>
        
        <h3>3.1 Account Data</h3>
        <ul>
          <li>Profile information (name, email, username, bio)</li>
          <li>Account preferences and settings</li>
          <li>Authentication credentials and tokens</li>
          <li>Billing and payment information</li>
        </ul>

        <h3>3.2 Content Data</h3>
        <ul>
          <li>BioLink pages and configurations</li>
          <li>Campaign materials and settings</li>
          <li>UGC content and metadata</li>
          <li>Automation workflows and logs</li>
          <li>Uploaded images, videos, and documents</li>
        </ul>

        <h3>3.3 Facebook/Instagram Integration Data</h3>
        <ul>
          <li>Access tokens and permissions</li>
          <li>Cached profile information</li>
          <li>Media content obtained through APIs</li>
          <li>Analytics data from social platforms</li>
          <li>Engagement metrics and insights</li>
        </ul>

        <h3>3.4 Analytics and Usage Data</h3>
        <ul>
          <li>Platform usage statistics</li>
          <li>Performance metrics</li>
          <li>Click-through and conversion data</li>
          <li>Device and browser information</li>
        </ul>

        <h2>4. Data Deletion Process</h2>
        
        <div className="process-box">
          <h3>Step-by-Step Deletion Process</h3>
          
          <p><span className="step-number">1</span><strong>Request Submission</strong></p>
          <p>Submit your deletion request through one of the following methods:</p>
          <ul>
            <li>Account settings page (self-service deletion)</li>
            <li>Email to: ggs699000@gmail.com</li>
            <li>Contact form on our website</li>
            <li>Customer support ticket</li>
          </ul>

          <p><span className="step-number">2</span><strong>Identity Verification</strong></p>
          <p>We will verify your identity to ensure the request is legitimate:</p>
          <ul>
            <li>Email confirmation</li>
            <li>Account password verification</li>
            <li>Additional security questions if needed</li>
          </ul>

          <p><span className="step-number">3</span><strong>Data Identification</strong></p>
          <p>We will identify all data associated with your account:</p>
          <ul>
            <li>Primary account data</li>
            <li>Content and media files</li>
            <li>Third-party integration data</li>
            <li>Analytics and usage data</li>
          </ul>

          <p><span className="step-number">4</span><strong>Deletion Execution</strong></p>
          <p>We will delete your data from:</p>
          <ul>
            <li>Primary databases</li>
            <li>Backup systems</li>
            <li>CDN and file storage</li>
            <li>Analytics platforms</li>
            <li>Third-party services</li>
          </ul>

          <p><span className="step-number">5</span><strong>Confirmation</strong></p>
          <p>We will send you a confirmation email detailing what was deleted and any data that was retained for legal reasons.</p>
        </div>

        <h2>5. Facebook/Instagram Data Deletion</h2>
        
        <h3>5.1 Revoking Permissions</h3>
        <p>To stop us from accessing your Facebook/Instagram data:</p>
        <ul>
          <li>Go to your Facebook/Instagram settings</li>
          <li>Navigate to "Apps and Websites" or "Authorized Apps"</li>
          <li>Find MYVYTEX in the list</li>
          <li>Click "Remove" or "Revoke Access"</li>
        </ul>

        <h3>5.2 Data Deletion Timeline</h3>
        <div className="success-box">
          <p><strong>Deletion Timeline:</strong></p>
          <ul>
            <li><strong>Immediate:</strong> Access tokens are revoked</li>
            <li><strong>Within 24 hours:</strong> Cached data is deleted</li>
            <li><strong>Within 7 days:</strong> All associated data is removed</li>
            <li><strong>Within 30 days:</strong> Backup data is purged</li>
          </ul>
        </div>

        <h2>6. Data Retention Exceptions</h2>
        
        <div className="warning-box">
          <p><strong>Important:</strong> We may retain certain data for legal or operational reasons:</p>
          <ul>
            <li><strong>Legal Requirements:</strong> Data required by law (tax records, audit logs)</li>
            <li><strong>Security Purposes:</strong> Fraud prevention and security logs</li>
            <li><strong>Dispute Resolution:</strong> Data needed for legal proceedings</li>
            <li><strong>Service Improvement:</strong> Anonymized analytics data</li>
            <li><strong>Backup Systems:</strong> Data in backup systems (deleted within 30 days)</li>
          </ul>
        </div>

        <h2>7. Self-Service Data Deletion</h2>
        
        <h3>7.1 Account Deletion</h3>
        <p>You can delete your account directly from your account settings:</p>
        <ol>
          <li>Log into your MYVYTEX account</li>
          <li>Go to "Account Settings"</li>
          <li>Scroll to "Danger Zone"</li>
          <li>Click "Delete Account"</li>
          <li>Confirm the deletion</li>
        </ol>

        <h3>7.2 Selective Data Deletion</h3>
        <p>You can also delete specific content:</p>
        <ul>
          <li><strong>BioLink Pages:</strong> Delete individual pages from the BioLink dashboard</li>
          <li><strong>Campaigns:</strong> Delete campaigns from the Campaign Manager</li>
          <li><strong>UGC Content:</strong> Remove content from the UGC Hub</li>
          <li><strong>Automation Flows:</strong> Delete workflows from Automation Studio</li>
        </ul>

        <h2>8. Data Export Before Deletion</h2>
        <p>Before deleting your data, you may want to export it for your records:</p>
        
        <h3>8.1 Export Process</h3>
        <ol>
          <li>Go to "Account Settings" → "Data Export"</li>
          <li>Select the data types you want to export</li>
          <li>Choose the file format (JSON, CSV, or ZIP)</li>
          <li>Click "Request Export"</li>
          <li>Download the file when ready (available for 7 days)</li>
        </ol>

        <h3>8.2 Exportable Data</h3>
        <ul>
          <li>Account information and preferences</li>
          <li>BioLink configurations and content</li>
          <li>Campaign data and analytics</li>
          <li>UGC content and metadata</li>
          <li>Automation workflow definitions</li>
          <li>Usage statistics and reports</li>
        </ul>

        <h2>9. Third-Party Data Deletion</h2>
        
        <h3>9.1 Service Providers</h3>
        <p>We work with third-party service providers who may store your data:</p>
        <ul>
          <li><strong>Cloud Storage:</strong> Amazon S3, Google Cloud Storage</li>
          <li><strong>Analytics:</strong> Google Analytics, Mixpanel</li>
          <li><strong>Email Services:</strong> SendGrid, Mailchimp</li>
          <li><strong>Payment Processing:</strong> Stripe, PayPal</li>
        </ul>

        <h3>9.2 Deletion Coordination</h3>
        <p>When you request data deletion, we will:</p>
        <ul>
          <li>Delete data from our primary systems immediately</li>
          <li>Request deletion from service providers within 24 hours</li>
          <li>Verify deletion completion within 7 days</li>
          <li>Provide confirmation of all deletions</li>
        </ul>

        <h2>10. Compliance with Data Protection Laws</h2>
        
        <h3>10.1 GDPR Compliance</h3>
        <p>Under the General Data Protection Regulation (GDPR), you have the "Right to be Forgotten":</p>
        <ul>
          <li>We will delete your data within 30 days of your request</li>
          <li>We will inform third parties to delete your data</li>
          <li>We will provide confirmation of deletion</li>
          <li>We will not charge fees for deletion requests</li>
        </ul>

        <h3>10.2 CCPA Compliance</h3>
        <p>Under the California Consumer Privacy Act (CCPA):</p>
        <ul>
          <li>We will delete your personal information within 45 days</li>
          <li>We will verify your identity before deletion</li>
          <li>We will provide confirmation of deletion</li>
          <li>We will not discriminate against you for exercising your rights</li>
        </ul>

        <h2>11. Data Deletion Verification</h2>
        
        <h3>11.1 Deletion Confirmation</h3>
        <p>After processing your deletion request, we will send you a confirmation email that includes:</p>
        <ul>
          <li>Confirmation of data deletion</li>
          <li>List of data types that were deleted</li>
          <li>Any data that was retained and the reasons</li>
          <li>Timeline for complete deletion from all systems</li>
        </ul>

        <h3>11.2 Verification Process</h3>
        <p>To verify that your data has been deleted:</p>
        <ul>
          <li>We conduct internal audits of deletion processes</li>
          <li>We verify deletion with third-party service providers</li>
          <li>We maintain deletion logs for compliance purposes</li>
          <li>We provide audit reports upon request</li>
        </ul>

        <h2>12. Emergency Data Deletion</h2>
        <p>In case of security incidents or data breaches, we may initiate emergency data deletion:</p>
        <ul>
          <li>We will notify affected users immediately</li>
          <li>We will delete compromised data within 24 hours</li>
          <li>We will provide detailed information about the incident</li>
          <li>We will offer additional security measures</li>
        </ul>

        <h2>13. Contact Information</h2>
        <div className="contact-info">
          <p>For data deletion requests or questions about this policy, please contact us:</p>
          <ul>
            <li><strong>Data Deletion Requests:</strong> ggs699000@gmail.com</li>
            <li><strong>Data Protection Officer:</strong> ggs699000@gmail.com</li>
            <li><strong>General Support:</strong> ggs699000@gmail.com</li>
            <li><strong>Phone:</strong> +91 8141166187</li>
            <li><strong>Business Name:</strong> MYVYTEX</li>
          </ul>
          
          <p><strong>For Facebook/Instagram Integration Issues:</strong> ggs699000@gmail.com</p>
          
          <p><strong>Response Time:</strong> We will respond to all deletion requests within 24 hours and complete the deletion process within 30 days.</p>
        </div>

        <h2>14. Updates to This Policy</h2>
        <p>We may update this Data Deletion Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by:</p>
        <ul>
          <li>Posting the updated policy on our website</li>
          <li>Sending email notifications for significant changes</li>
          <li>Providing in-app notifications</li>
        </ul>

        <h2>15. Facebook Platform Policy Compliance</h2>
        <p>This Data Deletion Policy is designed to comply with Facebook's Platform Policy requirements:</p>
        <ul>
          <li>We provide clear information about data deletion processes</li>
          <li>We enable users to delete their data easily</li>
          <li>We delete Facebook/Instagram data when permissions are revoked</li>
          <li>We maintain appropriate data retention policies</li>
          <li>We provide confirmation of data deletion</li>
        </ul>

        <p><em>This Data Deletion Policy is effective as of the date listed above and will remain in effect until modified or updated.</em></p>
      </div>
    </div>
  );
};

export default DataDeletionPolicy;
