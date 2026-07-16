import React from "react";

export default function Privacy() {
  return (
    <div style={{ padding: "34px 18px 56px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Privacy Policy</h1>
        <div style={{ opacity: 0.75, marginBottom: 18 }}>Last updated: January 2026</div>

        <p>
          Splitley values your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use the Splitley application.
        </p>

        <h2>Information We Collect</h2>
        <p>When you use Splitley, we may collect the following information:</p>
        <ul>
          <li>Your name and email address through Google Sign-In</li>
          <li>Basic profile information provided during authentication</li>
          <li>Expense, group, and transaction data that you voluntarily add to the app</li>
        </ul>
        <p>
          We do not collect sensitive personal information such as passwords, payment card details, banking information, or government identification.
        </p>

        <h2>Google Sign-In and OAuth Data</h2>
        <p>Splitley uses Google Sign-In for authentication.</p>
        <p>
          When you choose to sign in with Google, we receive limited information from your Google account, such as your name, email address, and basic profile details, as permitted by Google. This information is used only to create and manage your Splitley account and to authenticate you securely.
        </p>
        <p>
          Splitley does not access your Google contacts, Google Drive, Gmail, calendar, photos, or any other Google services.
        </p>
        <p>
          Google user data is never sold, rented, or shared for advertising or marketing purposes.
        </p>

        <h2>How We Use Your Information</h2>
        <p>We use your information only to:</p>
        <ul>
          <li>Authenticate and manage your account</li>
          <li>Enable expense tracking, settlements, and group management features</li>
          <li>Provide core app functionality and maintain service reliability</li>
          <li>Communicate important updates related to your account</li>
        </ul>
        <p>
          We do not use your personal data for advertising, profiling, or marketing purposes.
        </p>

        <h2>Data Storage and Security</h2>
        <p>
          Your data is stored using trusted third-party infrastructure providers for authentication and hosting.
        </p>
        <p>
          We use industry-standard security practices and secure authentication mechanisms to help protect your information from unauthorized access, loss, or misuse. While we take reasonable steps to safeguard your data, no system can be guaranteed to be completely secure.
        </p>

        <h2>Data Sharing</h2>
        <p>We do not sell or rent your personal information.</p>
        <p>We may share limited information only in the following cases:</p>
        <ul>
          <li>When required by law or legal process</li>
          <li>With trusted service providers used strictly for authentication, hosting, and operating the app</li>
        </ul>
        <p>
          All service providers are required to protect your data and use it only to support Splitley's functionality.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your personal information only for as long as your account remains active or as needed to provide the service.
        </p>
        <p>
          When you request account deletion, your personal data is permanently removed within a reasonable timeframe, except where retention is required by law or for legitimate operational purposes.
        </p>
        <p>
          Shared expense records may remain visible to other group members as part of their records, without your personal identifiers.
        </p>

        <h2>Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your personal information within the app</li>
          <li>Request deletion of your account and associated personal data</li>
          <li>Revoke Google Sign-In access at any time from your Google Account security settings</li>
        </ul>
        <p>
          Revoking Google access will prevent future logins but will not automatically delete your Splitley account unless you request deletion.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          Splitley is not intended for use by children under the age of 13.
        </p>
        <p>
          We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will promptly delete it.
        </p>

        <h2>Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will be effective immediately upon posting. The latest revision date will always be shown at the top of this page.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or your data, please contact us at:
        </p>
        <p>
          Email: <a href="mailto:support@splitley.com">support@splitley.com</a>
        </p>
      </div>
    </div>
  );
}
