"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, UserCog, Mail, RefreshCw, Shield, Loader2 } from "lucide-react"

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  is_admin: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterTier, setFilterTier] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const fetchUsers = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      // Get emails from auth (we need to join with a server-side call)
      // For now, use the profile data
      setUsers(data.map(p => ({
        ...p,
        email: p.id, // We'll display ID for now, email needs admin API
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase())

    const matchesTier = filterTier === "all" || user.subscription_tier === filterTier

    return matchesSearch && matchesTier
  })

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
    setMessage("")
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return
    setSaving(true)
    setMessage("")

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        business_name: selectedUser.business_name,
        subscription_tier: selectedUser.subscription_tier,
        is_admin: selectedUser.is_admin,
      })
      .eq("id", selectedUser.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage("User updated successfully")
      fetchUsers()
      setTimeout(() => {
        setEditDialogOpen(false)
      }, 1500)
    }
    setSaving(false)
  }

  const handleResetPassword = async (userId: string) => {
    // This would need the admin API - show message for now
    setMessage("Password reset email functionality requires Supabase Admin API integration.")
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "command":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "momentum":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "launch":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all registered users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users.length} total users</CardDescription>
            </div>
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="launch">Launch</SelectItem>
                <SelectItem value="momentum">Momentum</SelectItem>
                <SelectItem value="command">Command</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : "No name"}
                            </div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.business_name || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTierBadgeColor(user.subscription_tier)}>
                            {user.subscription_tier || "free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_admin ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and subscription details
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={selectedUser.first_name || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={selectedUser.last_name || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business">Business Name</Label>
                <Input
                  id="business"
                  value={selectedUser.business_name || ""}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, business_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select
                  value={selectedUser.subscription_tier || "free"}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, subscription_tier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
                    <SelectItem value="momentum">Momentum</SelectItem>
                    <SelectItem value="command">Command</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Administrator</div>
                  <div className="text-sm text-muted-foreground">
                    Grant admin console access
                  </div>
                </div>
                <Button
                  variant={selectedUser.is_admin ? "destructive" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSelectedUser({ ...selectedUser, is_admin: !selectedUser.is_admin })
                  }
                >
                  {selectedUser.is_admin ? "Revoke" : "Grant"}
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleResetPassword(selectedUser.id)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Password Reset Email
                </Button>
              </div>

              {message && (
                <p className={`text-sm ${message.includes("Error") ? "text-destructive" : "text-green-500"}`}>
                  {message}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
