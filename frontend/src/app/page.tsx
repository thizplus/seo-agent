import { redirect } from "next/navigation"
import { NAV_ROUTES } from "@/constants/nav"

export default function Home() {
  redirect(NAV_ROUTES.DASHBOARD)
}
