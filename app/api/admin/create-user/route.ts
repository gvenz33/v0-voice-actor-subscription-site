import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("is_admin, is_superadmin")
      .eq("id", user.id)
      .single()

    if (!currentProfile?.is_admin && !currentProfile?.is_superadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, firstName, lastName, tier } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Create user using Supabase Auth Admin API
    // Note: This requires service role key which is handled server-side
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
      },
    })

    if (authError) {
      // Fallback: Try regular signup if admin API is not available
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || null,
            last_name: lastName || null,
          },
        },
      })

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 })
      }

      // Update the profile with tier if user was created
      if (signUpData.user) {
        await supabase
          .from("profiles")
          .update({
            subscription_tier: tier || "free",
            first_name: firstName || null,
            last_name: lastName || null,
            feature_overrides: tier !== "free" ? { paymentBypass: true } : {},
          })
          .eq("id", signUpData.user.id)

        return NextResponse.json({
          success: true,
          userId: signUpData.user.id,
          message: "User created. They will need to confirm their email.",
        })
      }
    }

    // If admin API worked, update the profile
    if (authData?.user) {
      await supabase
        .from("profiles")
        .update({
          subscription_tier: tier || "free",
          first_name: firstName || null,
          last_name: lastName || null,
          feature_overrides: tier !== "free" ? { paymentBypass: true } : {},
        })
        .eq("id", authData.user.id)

      return NextResponse.json({
        success: true,
        userId: authData.user.id,
        message: "User created successfully.",
      })
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
