import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact VO Biz Suite support. Questions about plans, features, billing, or getting started as a voice actor on the platform.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | VO Biz Suite",
    description: "Get in touch with the VO Biz Suite team.",
    url: "/contact",
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
