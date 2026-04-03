import { createClient } from "@/lib/supabase/client"

export type ContactPickerRow = {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
}

export async function fetchContactsPicker(): Promise<ContactPickerRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("contacts")
    .select("id, company_name, contact_name, email")
    .eq("user_id", user.id)
    .order("company_name", { ascending: true })
  if (error) throw error
  return (data || []) as ContactPickerRow[]
}
