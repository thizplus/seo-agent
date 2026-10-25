"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAutoPublishSettings, useUpdateAutoPublish } from "@/features/settings"
import type { AutoPublishSettings } from "@/features/settings"
import { Loader2Icon, CalendarClockIcon } from "lucide-react"

const DAY_LABELS = [
  { value: 0, label: "อาทิตย์", short: "อา" },
  { value: 1, label: "จันทร์", short: "จ" },
  { value: 2, label: "อังคาร", short: "อ" },
  { value: 3, label: "พุธ", short: "พ" },
  { value: 4, label: "พฤหัสบดี", short: "พฤ" },
  { value: 5, label: "ศุกร์", short: "ศ" },
  { value: 6, label: "เสาร์", short: "ส" },
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0")
  return { value: `${h}:00`, label: `${h}:00` }
})

export default function AutoPublishPage() {
  const { data: settings, isLoading } = useAutoPublishSettings()
  const updateMutation = useUpdateAutoPublish()

  const [form, setForm] = useState<AutoPublishSettings>({
    enabled: false,
    days: [],
    time: "09:00",
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm(settings)
      setHasChanges(false)
    }
  }, [settings])

  const updateForm = (partial: Partial<AutoPublishSettings>) => {
    setForm((prev) => ({ ...prev, ...partial }))
    setHasChanges(true)
  }

  const toggleDay = (day: number) => {
    const newDays = form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day].sort((a, b) => a - b)
    updateForm({ days: newDays })
  }

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => setHasChanges(false),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า Auto Publish</h1>
        <p className="text-muted-foreground">
          ตั้งวันและเวลาที่ระบบจะ publish บทความจากคิวอัตโนมัติ (วันละ 1 บทความต่อ site)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClockIcon className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Auto Publish</CardTitle>
                <CardDescription>เปิด/ปิดระบบ publish อัตโนมัติ</CardDescription>
              </div>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => updateForm({ enabled: checked })}
            />
          </div>
        </CardHeader>

        {form.enabled && (
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>วันที่ publish</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map(({ value, label, short }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.days.includes(value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-accent"
                    }`}
                    title={label}
                  >
                    {short}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                เลือกวันที่ต้องการให้ระบบ publish บทความอัตโนมัติ
              </p>
            </div>

            <div className="space-y-2">
              <Label>เวลา publish</Label>
              <Select
                value={form.time}
                onValueChange={(value) => updateForm({ time: value ?? "09:00" })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                บทความจะถูก publish ตามเวลานี้ (เวลาไทย)
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">เงื่อนไขการ publish:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>เฉพาะบทความที่สร้างจากคิวหรือ keyword อัตโนมัติ</li>
                <li>บทความต้องเขียนเสร็จแล้ว (สถานะ completed)</li>
                <li>ยังไม่ได้ publish (สถานะ draft)</li>
                <li>Publish เก่าสุดก่อน วันละ 1 บทความต่อ site</li>
                <li>ถ้าไม่มีรูปปก ระบบจะสุ่มรูปจากหน้าเว็บให้อัตโนมัติ</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          บันทึก
        </Button>
      </div>
    </div>
  )
}
