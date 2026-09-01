"use client"

import { use } from "react"
import { PageHeader } from "@/components/page-header"
import { NAV_ROUTES } from "@/constants/nav"
import {
  useSiteDetail,
  SiteInfoCard,
  PipelineCard,
  PagesCard,
  GscConnectionCard,
  KeywordsCard,
  TopicClustersCard,
  CompetitorAnalysisCard,
  ArticlesCard,
  MembersCard,
} from "@/features/sites"

export default function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: site, isLoading } = useSiteDetail(id)

  if (isLoading) {
    return (
      <>
        <PageHeader items={[{ label: "กำลังโหลด..." }]} />
        <div className="p-4 text-muted-foreground">กำลังโหลดเว็บไซต์...</div>
      </>
    )
  }

  if (!site) {
    return (
      <>
        <PageHeader items={[{ label: "ไม่พบข้อมูล" }]} />
        <div className="p-4 text-destructive">ไม่พบเว็บไซต์</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        items={[
          { label: "Dashboard", href: NAV_ROUTES.DASHBOARD },
          { label: "เว็บไซต์", href: NAV_ROUTES.SITES.LIST },
          { label: site.name },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <SiteInfoCard site={site} />
        <PipelineCard siteId={id} />
        <PagesCard siteId={id} />
        <GscConnectionCard site={site} />
        <KeywordsCard siteId={id} />
        <TopicClustersCard siteId={id} />
        <CompetitorAnalysisCard siteId={id} />
        <ArticlesCard siteId={id} />
        <MembersCard siteId={id} />
      </div>
    </>
  )
}
