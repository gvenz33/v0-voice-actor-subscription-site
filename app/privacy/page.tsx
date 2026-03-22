import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for VOBizSuite - Learn how we collect, use, and protect your personal information.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link 
          href="/" 
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
        
        <h1 className="mb-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to VOBizSuite. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we collect, use, disclose, and safeguard your information when you 
              use our voice actor business management platform.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">We collect information you provide directly to us, including:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Account information (name, email address, password)</li>
              <li>Profile information (business name, experience level)</li>
              <li>Client and contact information you store in the platform</li>
              <li>Audition tracking data and notes</li>
              <li>Invoice and payment information</li>
              <li>Communications with our AI assistant</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Power our AI features to assist with your voice acting business</li>
              <li>Monitor and analyze trends and usage</li>
              <li>Detect, investigate, and prevent fraudulent activity</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal data 
              against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data 
              in transit and at rest, secure authentication practices, and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you services. 
              You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party services for payment processing, analytics, and AI functionality. These services 
              have their own privacy policies governing the use of your information. We use Stripe for payment processing 
              and Supabase for data storage.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">7. Your Rights</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@vobizsuite.com" className="text-primary hover:underline">
                support@vobizsuite.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
