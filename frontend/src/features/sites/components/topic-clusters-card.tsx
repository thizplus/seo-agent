"use client"

import { useState } from "react"
import { useCreateCluster } from "../hooks"
import { useKeywordList } from "@/features/keywords"
import type { TopicClusterResult } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NetworkIcon, PlusIcon, Loader2Icon, ArrowRightIcon } from "lucide-react"

interface TopicClustersCardProps {
  siteId: string
}

export function TopicClustersCard({ siteId }: TopicClustersCardProps) {
  const { data: keywords } = useKeywordList(siteId)
  const createCluster = useCreateCluster(siteId)
  const [clusters, setClusters] = useState<TopicClusterResult[]>([])

  const handleCreate = () => {
    const kwList = keywords?.map((k) => k.keyword) || []
    if (kwList.length < 2) {
      alert("ต้องมีคีย์เวิร์ดอย่างน้อย 2 คำ")
      return
    }
    createCluster.mutate(kwList, {
      onSuccess: (result) => setClusters((prev) => [...prev, result]),
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NetworkIcon className="size-5" />
              กลุ่มหัวข้อ
            </CardTitle>
            <CardDescription>จัดกลุ่มคีย์เวิร์ดเป็นบทความหลัก + บทความสนับสนุน</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={createCluster.isPending || !keywords?.length}
          >
            {createCluster.isPending ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <PlusIcon className="mr-1 size-4" />}
            {createCluster.isPending ? "กำลังสร้าง..." : "สร้างกลุ่ม"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {clusters.length === 0 ? (
          <div className="text-center py-6">
            <NetworkIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">
              ยังไม่มีกลุ่ม เพิ่มคีย์เวิร์ด 2+ แล้วสร้างกลุ่ม
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {clusters.map((cluster, idx) => (
              <div key={idx} className="rounded-lg border p-4">
                <div className="mb-3">
                  <Badge className="mb-2">บทความหลัก</Badge>
                  <h4 className="font-semibold">{cluster.pillarTitle}</h4>
                  <p className="text-muted-foreground">{cluster.pillarKeyword}</p>
                </div>

                {cluster.supportingKeywords.length > 0 && (
                  <div className="mb-3">
                    <p className="font-medium text-muted-foreground mb-2">บทความสนับสนุน</p>
                    <div className="flex flex-col gap-1.5">
                      {cluster.supportingKeywords.map((sk, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <ArrowRightIcon className="size-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{sk.title}</span>
                          <Badge variant="outline" className="text-xs">{sk.relationship}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cluster.linkMap.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">แผนผังลิงก์ภายใน</p>
                    <div className="flex flex-col gap-1 text-xs">
                      {cluster.linkMap.map((link, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="truncate max-w-[200px]">{link.from}</span>
                          <ArrowRightIcon className="size-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{link.to}</span>
                          <Badge variant="secondary" className="text-xs ml-auto shrink-0">{link.anchorText}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
