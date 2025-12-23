'use client'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: December 23, 2024</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-600 mb-4">
                RevPilot Sales Coach (&quot;the Extension&quot;) is a Chrome browser extension that provides
                real-time AI-powered sales coaching during Zoom calls. This privacy policy explains
                how we collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Account Information</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Email address (for authentication)</li>
                <li>Password (securely hashed, never stored in plain text)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Meeting Data</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Zoom meeting URLs (to join coaching sessions)</li>
                <li>Meeting transcripts (processed in real-time for coaching suggestions)</li>
                <li>Coaching session metadata (start time, duration, status)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">What We Do NOT Collect</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Audio or video recordings of your calls</li>
                <li>Personal information of other meeting participants</li>
                <li>Browsing history outside of Zoom pages</li>
                <li>Any data from non-Zoom websites</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Authentication:</strong> To verify your identity and provide access to the service</li>
                <li><strong>Real-time Coaching:</strong> To analyze conversation context and generate helpful suggestions</li>
                <li><strong>Service Improvement:</strong> To improve our AI coaching algorithms (using anonymized data only)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Storage & Security</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>All data is encrypted in transit using TLS/SSL</li>
                <li>Data is stored securely on Supabase (SOC 2 Type II compliant)</li>
                <li>Authentication tokens are stored locally in Chrome&apos;s secure storage</li>
                <li>We do not sell or share your personal data with third parties</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-600 mb-4">We use the following third-party services:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>OpenAI:</strong> AI-powered coaching suggestions (conversation data is not used for training)</li>
                <li><strong>Recall.ai:</strong> Meeting transcription services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Chrome Extension Permissions</h2>
              <p className="text-gray-600 mb-4">Our extension requests the following permissions:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>storage:</strong> To save your authentication token locally so you stay logged in</li>
                <li><strong>activeTab:</strong> To detect when you&apos;re on a Zoom call and show the coaching overlay</li>
                <li><strong>scripting:</strong> To inject the coaching interface into Zoom web pages</li>
                <li><strong>Host permissions (zoom.us):</strong> To operate only on Zoom meeting pages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-600">
                Coaching session data is retained for 90 days to allow you to review past sessions.
                You can request deletion of your data at any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-600">
                Our service is not intended for users under 18 years of age. We do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this privacy policy from time to time. We will notify you of any
                changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600">
                If you have any questions about this privacy policy or our data practices,
                please contact us at:
              </p>
              <p className="text-gray-600 mt-2">
                <strong>Email:</strong> support@revpilot.app
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <a
              href="/"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to RevPilot
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
