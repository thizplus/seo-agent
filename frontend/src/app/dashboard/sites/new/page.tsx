"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { useCreateSite } from "@/features/sites"
import { NAV_ROUTES } from "@/constants/nav"
import { LLM_PROVIDERS } from "@/constants/llm-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NewSitePage() {
  const router = useRouter()
  const createSite = useCreateSite()

  const [form, setForm] = useState({
    name: "",
    url: "",
    description: "",
    industry: "",
    llmProvider: "gemini",
    llmApiKey: "",
    wpUrl: "",
    wpUsername: "",
    wpAppPassword: "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const site = await createSite.mutateAsync(form)
      router.push(NAV_ROUTES.SITES.DETAIL(site.id))
    } catch {
      // error handled by mutation
    }
  }

  return (
    <>
      <PageHeader
        items={[
          { label: "Dashboard", href: NAV_ROUTES.DASHBOARD },
          { label: "Sites", href: NAV_ROUTES.SITES.LIST },
          { label: "Add Site" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-2xl">
        <h1 className="text-2xl font-bold">Add New Site</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>Basic details about your website</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Site Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="My Website"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What is this site about?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  placeholder="e.g. ecommerce, health, education"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Config */}
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Choose your LLM provider for AI-powered content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="llmProvider">LLM Provider</Label>
                <select
                  id="llmProvider"
                  name="llmProvider"
                  value={form.llmProvider}
                  onChange={(e) => setForm((prev) => ({ ...prev, llmProvider: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="llmApiKey">API Key</Label>
                <Input
                  id="llmApiKey"
                  name="llmApiKey"
                  type="password"
                  value={form.llmApiKey}
                  onChange={handleChange}
                  placeholder={LLM_PROVIDERS.find((p) => p.value === form.llmProvider)?.placeholder || "..."}
                />
              </div>
            </CardContent>
          </Card>

          {/* WordPress Config */}
          <Card>
            <CardHeader>
              <CardTitle>WordPress Connection</CardTitle>
              <CardDescription>
                Connect to WordPress for auto-publishing
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wpUrl">WordPress URL</Label>
                <Input
                  id="wpUrl"
                  name="wpUrl"
                  value={form.wpUrl}
                  onChange={handleChange}
                  placeholder="https://your-wordpress-site.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wpUsername">Username</Label>
                <Input
                  id="wpUsername"
                  name="wpUsername"
                  value={form.wpUsername}
                  onChange={handleChange}
                  placeholder="admin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wpAppPassword">Application Password</Label>
                <Input
                  id="wpAppPassword"
                  name="wpAppPassword"
                  type="password"
                  value={form.wpAppPassword}
                  onChange={handleChange}
                  placeholder="xxxx xxxx xxxx xxxx"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="submit" disabled={createSite.isPending}>
              {createSite.isPending ? "Creating..." : "Create Site"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(NAV_ROUTES.SITES.LIST)}
            >
              Cancel
            </Button>
          </div>
          {createSite.isError && (
            <p className="text-sm text-destructive">
              {createSite.error.message}
            </p>
          )}
        </form>
      </div>
    </>
  )
}
