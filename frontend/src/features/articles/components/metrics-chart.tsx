"use client"

import { useMetricsHistory } from "../hooks"
import type { MetricsHistoryPoint } from "../types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2Icon, TrendingUpIcon } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface MetricsChartProps {
  articleId: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatChartData(history: MetricsHistoryPoint[]) {
  return history.map((h) => ({
    date: formatDate(h.checkedAt),
    clicks: h.clicks,
    impressions: h.impressions,
    position: h.position,
    ctr: +(h.ctr * 100).toFixed(1),
  }))
}

export function MetricsChart({ articleId }: MetricsChartProps) {
  const { data: history, isLoading, refetch } = useMetricsHistory(articleId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUpIcon className="size-4" />
            แนวโน้ม (90 วัน)
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2Icon className="mr-1 size-4 animate-spin" />
            ) : (
              <TrendingUpIcon className="mr-1 size-4" />
            )}
            {isLoading ? "กำลังโหลด..." : "โหลดกราฟ"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "กำลังโหลด..."
              : "กด \"โหลดกราฟ\" เพื่อดูแนวโน้ม (ข้อมูลจะเริ่มเก็บเมื่อระบบรัน Ranking Tracker)"}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Clicks & Impressions */}
            <div>
              <h4 className="text-sm font-medium mb-2">คลิก & แสดงผล</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatChartData(history)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name="คลิก"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    name="แสดงผล"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Position */}
            <div>
              <h4 className="text-sm font-medium mb-2">อันดับเฉลี่ย</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={formatChartData(history)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis reversed className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="position"
                    name="อันดับ"
                    stroke="hsl(var(--chart-1, 220 70% 50%))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
