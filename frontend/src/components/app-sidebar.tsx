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
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  GlobeIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"
import { NAV_ROUTES } from "@/constants/nav"
import { authStore, type User } from "@/features/auth"

const navItems = [
  {
    title: "Dashboard",
    url: NAV_ROUTES.DASHBOARD,
    icon: <LayoutDashboardIcon />,
    isActive: true,
    items: [],
  },
  {
    title: "Sites",
    url: NAV_ROUTES.SITES.LIST,
    icon: <GlobeIcon />,
    items: [
      { title: "All Sites", url: NAV_ROUTES.SITES.LIST },
      { title: "Add Site", url: NAV_ROUTES.SITES.NEW },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(authStore.getUser())
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
                <span className="truncate text-xs">AI SEO Machine</span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
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
