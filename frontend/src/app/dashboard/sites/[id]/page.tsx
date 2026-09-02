"use client"

import { use } from "react"
import { PageHeader } from "@/components/page-header"
import { NAV_ROUTES } from "@/constants/nav"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  FocusQueueCard,
  AiSettingsCard,
} from "@/features/sites"
import { LayoutDashboardIcon, FileTextIcon, KeyIcon, WrenchIcon } from "lucide-react"

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
      <div className="flex flex-1 flex-col p-4 pt-0">
        <Tabs defaultValue={0}>
          <TabsList className="mb-4">
            <TabsTrigger value={0}>
              <LayoutDashboardIcon className="size-4" />
              ภาพรวม
            </TabsTrigger>
            <TabsTrigger value={1}>
              <FileTextIcon className="size-4" />
              บทความ
            </TabsTrigger>
            <TabsTrigger value={2}>
              <KeyIcon className="size-4" />
              คีย์เวิร์ด
            </TabsTrigger>
            <TabsTrigger value={3}>
              <WrenchIcon className="size-4" />
              เครื่องมือ
            </TabsTrigger>
          </TabsList>

          <TabsContent value={0} className="flex flex-col gap-6">
            <SiteInfoCard site={site} />
            <AiSettingsCard site={site} />
            <PipelineCard siteId={id} />
            <FocusQueueCard siteId={id} />
          </TabsContent>

          <TabsContent value={1} className="flex flex-col gap-6">
            <ArticlesCard siteId={id} />
          </TabsContent>

          <TabsContent value={2} className="flex flex-col gap-6">
            <KeywordsCard siteId={id} />
            <PagesCard siteId={id} />
            <TopicClustersCard siteId={id} />
          </TabsContent>

          <TabsContent value={3} className="flex flex-col gap-6">
            <GscConnectionCard site={site} />
            <CompetitorAnalysisCard siteId={id} />
            <MembersCard siteId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
