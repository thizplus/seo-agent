"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  GlobeIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ROUTES } from "@/constants/nav"
import { authStore, type User } from "@/features/auth"
import { siteService } from "@/features/sites"

const mainNavItems = [
  {
    title: "แดชบอร์ด",
    url: NAV_ROUTES.DASHBOARD,
    icon: <LayoutDashboardIcon />,
    isActive: true,
    items: [],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<User | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const pathname = usePathname()

  useEffect(() => {
    setUser(authStore.getUser())
    siteService.getAll().then((data) => {
      setSites(data.map((s) => ({ id: s.id, name: s.name })))
    }).catch(() => {})
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href={NAV_ROUTES.DASHBOARD}
              className={sidebarMenuButtonVariants({ size: "lg" })}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <SearchIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">SEO Agents</span>
                <span className="truncate text-xs">ระบบ SEO อัตโนมัติ</span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNavItems} />

        <SidebarGroup>
          <SidebarGroupLabel>เว็บไซต์</SidebarGroupLabel>
          <SidebarMenu>
            {sites.map((site) => (
              <SidebarMenuItem key={site.id}>
                <SidebarMenuButton
                  tooltip={site.name}
                  data-active={pathname === NAV_ROUTES.SITES.DETAIL(site.id) || undefined}
                  render={<Link href={NAV_ROUTES.SITES.DETAIL(site.id)} />}
                >
                  <GlobeIcon />
                  <span>{site.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="เพิ่มเว็บไซต์"
                render={<Link href={NAV_ROUTES.SITES.NEW} />}
              >
                <PlusIcon />
                <span>เพิ่มเว็บไซต์</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name || "User",
            email: user?.email || "",
            avatar: user?.avatarUrl || "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
