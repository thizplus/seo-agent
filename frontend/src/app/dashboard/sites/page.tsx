"use client"

import { PageHeader } from "@/components/page-header"
import { useSiteList, useDeleteSite } from "@/features/sites"
import { NAV_ROUTES } from "@/constants/nav"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react"

export default function SitesPage() {
  const { data: sites, isLoading } = useSiteList()
  const deleteSite = useDeleteSite()

  return (
    <>
      <PageHeader
        items={[
          { label: "Dashboard", href: NAV_ROUTES.DASHBOARD },
          { label: "Sites" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sites</h1>
          <Link href={NAV_ROUTES.SITES.NEW} className={buttonVariants()}>
            <PlusIcon className="mr-2 size-4" />
            Add Site
          </Link>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : !sites?.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <GlobeIcon className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No sites yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">URL</th>
                  <th className="p-4 font-medium">AI</th>
                  <th className="p-4 font-medium">WordPress</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className="border-b last:border-0">
                    <td className="p-4">
                      <Link
                        href={NAV_ROUTES.SITES.DETAIL(site.id)}
                        className="font-medium hover:underline"
                      >
                        {site.name}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {site.url}
                    </td>
                    <td className="p-4">
                      {site.hasLlmKey ? (
                        <span className="text-green-600">{(site.llmProvider || "gemini").toUpperCase()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {site.hasWordPress ? (
                        <span className="text-blue-600">Connected</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete "${site.name}"?`)) {
                            deleteSite.mutate(site.id)
                          }
                        }}
                        disabled={deleteSite.isPending}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
