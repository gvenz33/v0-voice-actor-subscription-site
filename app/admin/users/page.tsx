"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Search, UserCog, Mail, RefreshCw, Shield, Loader2, Crown, Ban, Coins, Sparkles } from "lucide-react"

interface FeatureOverrides {
  hasFollowUpWriter?: boolean | null
  hasPitchGenerator?: boolean | null
  hasChatAssistant?: boolean | null
  hasProspectFinder?: boolean | null
  monthlyTokensOverride?: number | null
  disabled?: boolean
}

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_tier: string
  is_admin: boolean
  is_superadmin: boolean
  purchased_tokens: number
  feature_overrides: FeatureOverrides
  created_at: string
}

const TIER_FEATURES = {
  free: { hasFollowUpWriter: false, hasPitchGenerator: false, hasChatAssistant: false, hasProspectFinder: false, monthlyTokens: 0 },
  launch: { hasFollowUpWriter: false, hasPitchGenerator: false, hasChatAssistant: false, hasProspectFinder: false, monthlyTokens: 25 },
  momentum: { hasFollowUpWriter: true, hasPitchGenerator: true, hasChatAssistant: false, hasProspectFinder: true, monthlyTokens: 250 },
  command: { hasFollowUpWriter: true, hasPitchGenerator: true, hasChatAssistant: true, hasProspectFinder: true, monthlyTokens: -1 },
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
  const [currentUserIsSuperadmin, setCurrentUserIsSuperadmin] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Check if current user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .single()
      setCurrentUserIsSuperadmin(profile?.is_superadmin || false)
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setUsers(data.map(p => ({
        ...p,
        email: p.id,
        feature_overrides: p.feature_overrides || {},
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
    setSelectedUser({ ...user, feature_overrides: user.feature_overrides || {} })
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
        purchased_tokens: selectedUser.purchased_tokens,
        feature_overrides: selectedUser.feature_overrides,
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

  const updateFeatureOverride = (key: keyof FeatureOverrides, value: boolean | number | null) => {
    if (!selectedUser) return
    setSelectedUser({
      ...selectedUser,
      feature_overrides: {
        ...selectedUser.feature_overrides,
        [key]: value,
      },
    })
  }

  const getEffectiveFeature = (user: User, feature: keyof typeof TIER_FEATURES.free) => {
    const tierDefault = TIER_FEATURES[user.subscription_tier as keyof typeof TIER_FEATURES]?.[feature] ?? false
    const override = user.feature_overrides?.[feature as keyof FeatureOverrides]
    return override !== null && override !== undefined ? override : tierDefault
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

  const FeatureToggle = ({ 
    label, 
    feature, 
    description 
  }: { 
    label: string
    feature: keyof FeatureOverrides
    description: string
  }) => {
    if (!selectedUser) return null
    const tierDefault = TIER_FEATURES[selectedUser.subscription_tier as keyof typeof TIER_FEATURES]?.[feature as keyof typeof TIER_FEATURES.free]
    const currentValue = selectedUser.feature_overrides?.[feature]
    const isOverridden = currentValue !== null && currentValue !== undefined
    const effectiveValue = isOverridden ? currentValue : tierDefault

    return (
      <div className="flex items-center justify-between py-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label className="font-medium">{label}</Label>
            {isOverridden && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                Override
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground">
            Tier default: <span className={tierDefault ? "text-green-500" : "text-red-500"}>{tierDefault ? "Enabled" : "Disabled"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentValue === null || currentValue === undefined ? "default" : currentValue ? "enabled" : "disabled"}
            onValueChange={(val) => {
              if (val === "default") {
                updateFeatureOverride(feature, null)
              } else {
                updateFeatureOverride(feature, val === "enabled")
              }
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default</SelectItem>
              <SelectItem value="enabled">Force Enable</SelectItem>
              <SelectItem value="disabled">Force Disable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all registered users</p>
        {currentUserIsSuperadmin && (
          <Badge className="mt-2 bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Crown className="h-3 w-3 mr-1" />
            Superadmin Access
          </Badge>
        )}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className={user.feature_overrides?.disabled ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-1.5">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : "No name"}
                              {user.is_superadmin && <Crown className="h-3.5 w-3.5 text-amber-500" />}
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
                          {user.is_superadmin ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <Crown className="h-3 w-3 mr-1" />
                              Super
                            </Badge>
                          ) : user.is_admin ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.feature_overrides?.disabled ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              <Ban className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          ) : Object.keys(user.feature_overrides || {}).length > 0 ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Custom
                            </Badge>
                          ) : (
                            <span className="text-green-500">Active</span>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit User
              {selectedUser?.is_superadmin && <Crown className="h-4 w-4 text-amber-500" />}
            </DialogTitle>
            <DialogDescription>
              Manage user profile, subscription, and feature access
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 py-4">
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

                <Separator />

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Administrator
                    </div>
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
                    disabled={selectedUser.is_superadmin && !currentUserIsSuperadmin}
                  >
                    {selectedUser.is_admin ? "Revoke" : "Grant"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 border-red-500/30 bg-red-500/5">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-500" />
                      Disable Account
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Prevent user from accessing the platform
                    </div>
                  </div>
                  <Switch
                    checked={selectedUser.feature_overrides?.disabled || false}
                    onCheckedChange={(checked) => updateFeatureOverride("disabled", checked)}
                    disabled={selectedUser.is_superadmin}
                  />
                </div>

                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setMessage("Password reset email functionality requires Supabase Admin API.")}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Password Reset Email
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4 py-4">
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
                      <SelectItem value="launch">Launch ($19/mo)</SelectItem>
                      <SelectItem value="momentum">Momentum ($49/mo)</SelectItem>
                      <SelectItem value="command">Command ($99/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Purchased Tokens
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={selectedUser.purchased_tokens || 0}
                      onChange={(e) =>
                        setSelectedUser({ ...selectedUser, purchased_tokens: parseInt(e.target.value) || 0 })
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSelectedUser({ ...selectedUser, purchased_tokens: (selectedUser.purchased_tokens || 0) + 100 })}
                    >
                      +100
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedUser({ ...selectedUser, purchased_tokens: (selectedUser.purchased_tokens || 0) + 500 })}
                    >
                      +500
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manually add or remove purchased tokens from user's balance
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Monthly Tokens Override</Label>
                  <Select
                    value={
                      selectedUser.feature_overrides?.monthlyTokensOverride === null || 
                      selectedUser.feature_overrides?.monthlyTokensOverride === undefined
                        ? "default"
                        : selectedUser.feature_overrides.monthlyTokensOverride === -1
                        ? "unlimited"
                        : "custom"
                    }
                    onValueChange={(val) => {
                      if (val === "default") {
                        updateFeatureOverride("monthlyTokensOverride", null)
                      } else if (val === "unlimited") {
                        updateFeatureOverride("monthlyTokensOverride", -1)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use Tier Default</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                      <SelectItem value="custom">Custom Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedUser.feature_overrides?.monthlyTokensOverride !== null &&
                   selectedUser.feature_overrides?.monthlyTokensOverride !== undefined &&
                   selectedUser.feature_overrides.monthlyTokensOverride !== -1 && (
                    <Input
                      type="number"
                      placeholder="Custom monthly tokens"
                      value={selectedUser.feature_overrides.monthlyTokensOverride}
                      onChange={(e) => updateFeatureOverride("monthlyTokensOverride", parseInt(e.target.value) || 0)}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-2 py-4">
                <div className="rounded-lg border p-4 mb-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Override individual features for this user. "Use Default" follows the tier settings.
                    "Force Enable" grants access regardless of tier. "Force Disable" removes access.
                  </p>
                </div>

                <div className="divide-y rounded-lg border">
                  <div className="p-4">
                    <FeatureToggle
                      label="Follow-Up Writer"
                      feature="hasFollowUpWriter"
                      description="AI-powered follow-up email generation"
                    />
                  </div>
                  <div className="p-4">
                    <FeatureToggle
                      label="Pitch Generator"
                      feature="hasPitchGenerator"
                      description="AI-generated pitch scripts and proposals"
                    />
                  </div>
                  <div className="p-4">
                    <FeatureToggle
                      label="Chat Assistant"
                      feature="hasChatAssistant"
                      description="AI business assistant chat interface"
                    />
                  </div>
                  <div className="p-4">
                    <FeatureToggle
                      label="Prospect Finder"
                      feature="hasProspectFinder"
                      description="Web research and lead discovery tool"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {message && (
            <p className={`text-sm ${message.includes("Error") ? "text-destructive" : "text-green-500"}`}>
              {message}
            </p>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
