"use client"

import { useState, useEffect } from "react"
import { useUpdateSite } from "../hooks"
import type { Site } from "../types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SparklesIcon, Loader2Icon, CheckIcon } from "lucide-react"
import { TONE_OPTIONS } from "@/constants/ai-settings"

interface AiSettingsCardProps {
  site: Site
}

export function AiSettingsCard({ site }: AiSettingsCardProps) {
  const updateSite = useUpdateSite(site.id)
  const [tone, setTone] = useState(site.writingTone || "")
  const [guide, setGuide] = useState(site.contentGuide || "")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setTone(site.writingTone || "")
    setGuide(site.contentGuide || "")
  }, [site.writingTone, site.contentGuide])

  const handleSave = () => {
    updateSite.mutate({ writingTone: tone, contentGuide: guide }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
      onError: (err) => alert(err.message),
    })
  }

  const hasChanges = tone !== (site.writingTone || "") || guide !== (site.contentGuide || "")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-5" />
          ตั้งค่า AI เขียนบทความ
        </CardTitle>
        <CardDescription>
          กำหนดอารมณ์และแนวทางการเขียนสำหรับทุกบทความของเว็บไซต์นี้
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">อารมณ์การเขียน</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTone(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  tone === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-input"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">แนวทางเนื้อหา</label>
          <Textarea
            placeholder={"เช่น\n- เปรียบเทียบวัสดุ มี table ราคา\n- มีรีวิวจากลูกค้าจริง\n- มี FAQ อย่างน้อย 5 ข้อ\n- เน้น internal link ไปหน้าสินค้า"}
            rows={4}
            value={guide}
            onChange={(e) => setGuide(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            AI จะปฏิบัติตามแนวทางนี้ทุกบทความ
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={updateSite.isPending} className="self-end">
            {updateSite.isPending ? (
              <Loader2Icon className="mr-1 size-4 animate-spin" />
            ) : saved ? (
              <CheckIcon className="mr-1 size-4" />
            ) : null}
            {saved ? "บันทึกแล้ว" : "บันทึก"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
