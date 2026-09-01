"use client"

import { useState, useEffect } from "react"
import { useGscProperties, useSelectGscProperty, useDisconnectGsc } from "../hooks"
import { siteService } from "../service"
import type { Site } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3Icon, LinkIcon, UnlinkIcon } from "lucide-react"

interface GscConnectionCardProps {
  site: Site
}

export function GscConnectionCard({ site }: GscConnectionCardProps) {
  const gscProps = useGscProperties(site.id)
  const selectProperty = useSelectGscProperty(site.id)
  const disconnectGsc = useDisconnectGsc(site.id)
  const [properties, setProperties] = useState<{ siteUrl: string; permission: string }[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("gsc") === "connected" && site.hasGsc) {
      gscProps.mutate(undefined, {
        onSuccess: (data) => setProperties(data.properties || []),
      })
    }
  }, [site.hasGsc])

  const handleConnect = () => {
    window.location.href = siteService.getGscConnectURL(site.id)
  }

  const handleSelectProperty = (siteUrl: string) => {
    selectProperty.mutate(siteUrl, {
      onSuccess: () => window.location.reload(),
    })
  }

  const handleDisconnect = () => {
    if (!confirm("Disconnect Google Search Console?")) return
    disconnectGsc.mutate(undefined, {
      onSuccess: () => window.location.reload(),
    })
  }

  const handleLoadProperties = () => {
    gscProps.mutate(undefined, {
      onSuccess: (data) => setProperties(data.properties || []),
      onError: () => setProperties([]),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="size-5" />
              Google Search Console
            </CardTitle>
            <CardDescription>Track rankings, impressions, CTR</CardDescription>
          </div>
          {site.hasGsc && (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <UnlinkIcon className="mr-1 size-4" />
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!site.hasGsc ? (
          <div className="text-center py-4">
            <BarChart3Icon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Connect GSC to track article rankings</p>
            <Button className="mt-3" onClick={handleConnect}>
              <LinkIcon className="mr-2 size-4" />
              Connect Google Search Console
            </Button>
          </div>
        ) : !site.gscSiteUrl ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-green-600">Connected! Select a property:</p>
            {gscProps.isPending ? (
              <p className="text-sm text-muted-foreground">Loading properties...</p>
            ) : properties.length > 0 ? (
              <div className="flex flex-col gap-2">
                {properties.map((prop) => (
                  <Button
                    key={prop.siteUrl}
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleSelectProperty(prop.siteUrl)}
                  >
                    {prop.siteUrl}
                    <span className="ml-auto text-xs text-muted-foreground">{prop.permission}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">No properties found.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleLoadProperties}>
                  Reload Properties
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Connected</Badge>
            <span className="text-sm">{site.gscSiteUrl}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
