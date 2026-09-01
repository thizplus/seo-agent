"use client"

import { useState } from "react"
import { useSiteMembers, useAddMember, useRemoveMember } from "../hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersIcon, Loader2Icon, Trash2Icon, PlusIcon, MailIcon, CrownIcon } from "lucide-react"

interface MembersCardProps {
  siteId: string
}

export function MembersCard({ siteId }: MembersCardProps) {
  const { data: members, isLoading } = useSiteMembers(siteId)
  const addMember = useAddMember(siteId)
  const removeMember = useRemoveMember(siteId)
  const [email, setEmail] = useState("")

  const handleAdd = () => {
    if (!email.trim()) return
    addMember.mutate(email.trim(), {
      onSuccess: () => setEmail(""),
      onError: (err) => alert(err.message),
    })
  }

  const handleRemove = (memberId: string, memberEmail: string) => {
    if (!confirm(`ลบ ${memberEmail} ออกจากเว็บไซต์นี้?`)) return
    removeMember.mutate(memberId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-5" />
          สมาชิก
        </CardTitle>
        <CardDescription>
          จัดการสมาชิกที่เข้าถึงเว็บไซต์นี้ได้
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add member input */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="พิมพ์อีเมล..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            type="email"
          />
          <Button onClick={handleAdd} disabled={addMember.isPending || !email.trim()} size="default">
            {addMember.isPending ? (
              <Loader2Icon className="mr-1 size-4 animate-spin" />
            ) : (
              <PlusIcon className="mr-1 size-4" />
            )}
            เพิ่ม
          </Button>
        </div>

        {/* Members list */}
        {isLoading ? (
          <p className="text-muted-foreground">กำลังโหลด...</p>
        ) : !members?.length ? (
          <p className="text-muted-foreground">ยังไม่มีสมาชิก</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {member.role === "owner" ? (
                    <CrownIcon className="size-4 text-amber-500" />
                  ) : (
                    <MailIcon className="size-4 text-muted-foreground" />
                  )}
                  <span>{member.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === "owner" ? (
                    <Badge variant="default">เจ้าของ</Badge>
                  ) : member.joined ? (
                    <Badge variant="secondary">เข้าร่วมแล้ว</Badge>
                  ) : (
                    <Badge variant="outline">รอเข้าร่วม</Badge>
                  )}
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(member.id, member.email)}
                      disabled={removeMember.isPending}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
