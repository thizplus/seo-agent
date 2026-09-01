"use client"

import { useState } from "react"
import { useAnalyzeSite, useUpdateSite } from "../hooks"
import { LLM_PROVIDERS } from "@/constants/llm-providers"
import type { Site } from "../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GlobeIcon, Loader2Icon, PencilIcon, ScanSearchIcon } from "lucide-react"

interface SiteInfoCardProps {
  site: Site
}

export function SiteInfoCard({ site }: SiteInfoCardProps) {
  const analyzeSite = useAnalyzeSite(site.id)
  const updateSite = useUpdateSite(site.id)
  const [editOpen, setEditOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<Record<string, any> | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    url: "",
    description: "",
    industry: "",
    llmProvider: "",
    llmApiKey: "",
    wpUrl: "",
    wpUsername: "",
    wpAppPassword: "",
  })

  const handleAnalyze = () => {
    analyzeSite.mutate(undefined, {
      onSuccess: (data) => setAnalysisResult(data),
      onError: (err) => alert(err.message),
    })
  }

  const openEdit = () => {
    setEditForm({
      name: site.name,
      url: site.url,
      description: site.description || "",
      industry: site.industry || "",
      llmProvider: "",
      llmApiKey: "",
      wpUrl: "",
      wpUsername: "",
      wpAppPassword: "",
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, string> = {}
    if (editForm.name) data.name = editForm.name
    if (editForm.url) data.url = editForm.url
    data.description = editForm.description
    data.industry = editForm.industry
    if (editForm.llmProvider) data.llmProvider = editForm.llmProvider
    if (editForm.llmApiKey) data.llmApiKey = editForm.llmApiKey
    if (editForm.wpUrl) data.wpUrl = editForm.wpUrl
    if (editForm.wpUsername) data.wpUsername = editForm.wpUsername
    if (editForm.wpAppPassword) data.wpAppPassword = editForm.wpAppPassword
    await updateSite.mutateAsync(data)
    setEditOpen(false)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GlobeIcon className="size-5" />
                {site.name}
              </CardTitle>
              <CardDescription>{site.url}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzeSite.isPending}>
                {analyzeSite.isPending ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <ScanSearchIcon className="mr-1 size-4" />}
                {analyzeSite.isPending ? "Analyzing..." : "Analyze"}
              </Button>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <PencilIcon className="mr-1 size-4" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {site.industry && <Badge variant="outline">{site.industry}</Badge>}
            {site.hasLlmKey && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{(site.llmProvider || "gemini").toUpperCase()}</Badge>}
            {site.hasWordPress && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">WP Connected</Badge>}
          </div>
          {site.description && (
            <p className="mt-3 text-sm text-muted-foreground">{site.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update site settings and credentials</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" value={editForm.name} onChange={handleEditChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input id="edit-url" name="url" value={editForm.url} onChange={handleEditChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input id="edit-description" name="description" value={editForm.description} onChange={handleEditChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input id="edit-industry" name="industry" value={editForm.industry} onChange={handleEditChange} />
            </div>
            <hr />
            <p className="text-sm text-muted-foreground">Leave blank to keep current value</p>
            <div className="grid gap-2">
              <Label htmlFor="edit-llmProvider">LLM Provider</Label>
              <select
                id="edit-llmProvider"
                name="llmProvider"
                value={editForm.llmProvider}
                onChange={(e) => setEditForm((prev) => ({ ...prev, llmProvider: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Keep current</option>
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-llmApiKey">API Key</Label>
              <Input id="edit-llmApiKey" name="llmApiKey" type="password" value={editForm.llmApiKey} onChange={handleEditChange} placeholder="Leave blank to keep current" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-wpUrl">WordPress URL</Label>
              <Input id="edit-wpUrl" name="wpUrl" value={editForm.wpUrl} onChange={handleEditChange} placeholder="Leave blank to keep current" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-wpUsername">WP Username</Label>
              <Input id="edit-wpUsername" name="wpUsername" value={editForm.wpUsername} onChange={handleEditChange} placeholder="Leave blank to keep current" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-wpAppPassword">WP Application Password</Label>
              <Input id="edit-wpAppPassword" name="wpAppPassword" type="password" value={editForm.wpAppPassword} onChange={handleEditChange} placeholder="Leave blank to keep current" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSite.isPending}>
                {updateSite.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
            {updateSite.isError && (
              <p className="text-sm text-destructive">{updateSite.error.message}</p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Analysis Result */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearchIcon className="size-5" />
              Site Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Business Type</p>
                <p className="font-medium">{String(analysisResult.businessType || "-")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-medium">{String(analysisResult.industry || "-")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pages Crawled</p>
                <p className="font-medium">{String((analysisResult.crawlSummary as any)?.totalPages || 0)}</p>
              </div>
            </div>
            {analysisResult.brandVoice && (
              <div>
                <p className="text-sm text-muted-foreground">Brand Voice</p>
                <p className="text-sm mt-1">{String(analysisResult.brandVoice)}</p>
              </div>
            )}
            {analysisResult.seoScore && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">SEO Score</p>
                <div className="grid grid-cols-3 gap-4">
                  {["technical", "content", "onpage"].map((key) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold">{String((analysisResult.seoScore as any)?.[key] || 0)}/10</div>
                      <div className="text-xs text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                <div className="flex flex-col gap-2">
                  {(analysisResult.recommendations as any[]).slice(0, 5).map((rec, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.priority === "high" ? "destructive" : "secondary"}>{rec.priority}</Badge>
                        <span className="text-sm font-medium">{rec.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
