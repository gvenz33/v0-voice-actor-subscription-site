import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of Use for VOBizSuite - The terms and conditions governing your use of our platform.",
}

export default function TermsPage() {
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
        
        <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Use</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using VOBizSuite, you agree to be bound by these Terms of Use and all applicable laws 
              and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing 
              this platform.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              VOBizSuite is a business management platform designed for voice actors. Our services include client 
              relationship management, audition tracking, invoicing, AI-powered business tools, and other features 
              to help you manage and grow your voice acting career.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">3. User Accounts</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">To use our services, you must:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">4. Subscription and Payments</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              VOBizSuite offers various subscription tiers with different features and pricing:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li><strong>Free:</strong> Basic access to core features</li>
              <li><strong>Launch:</strong> Entry-level paid tier with AI features</li>
              <li><strong>Momentum:</strong> Enhanced features and increased AI usage</li>
              <li><strong>Command:</strong> Full access to all features with unlimited AI usage</li>
            </ul>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Subscriptions are billed monthly. You may cancel at any time, and cancellation will take effect at 
              the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Upload malicious code or content</li>
              <li>Impersonate any person or entity</li>
              <li>Use the AI features to generate harmful or misleading content</li>
              <li>Resell or redistribute our services without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The VOBizSuite platform, including its design, features, and content, is owned by us and protected 
              by intellectual property laws. You retain ownership of any data you input into the platform. By using 
              our AI features, you grant us a license to process your inputs solely to provide the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">7. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our AI tools are provided to assist with your business communications and operations. You are 
              responsible for reviewing and editing any AI-generated content before use. We do not guarantee 
              the accuracy, completeness, or suitability of AI-generated content for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              VOBizSuite is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages resulting from your use of or 
              inability to use the service. Our total liability shall not exceed the amount you paid us in the 
              12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violations of these terms or for any other 
              reason at our discretion. Upon termination, your right to use the service will immediately cease. 
              You may export your data before termination.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify you of significant changes 
              via email or through the platform. Your continued use of the service after changes constitutes 
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Use, please contact us at{" "}
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
