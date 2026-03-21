import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <Link href="/" className="flex items-center">
            <Image 
              src="/images/vobizsuite-logo.png" 
              alt="VOBizSuite" 
              width={700} 
              height={175} 
              className="h-32 w-auto mix-blend-lighten"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              How It Works
            </Link>
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {`\u00A9 ${new Date().getFullYear()} VO Biz Suite. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  )
}
