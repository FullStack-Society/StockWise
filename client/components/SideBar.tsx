"use client";

import Link from "next/link";
import Styles from "@/styles/SideBar.module.css";

export default function SideBar() {
  return (
    <nav className={Styles.nav}>
      <Link href="@/app/pages/dashboard">Dashboard</Link>
      <Link href="@/app/pages/inventory">Inventory</Link>
      <Link href="@/app/pages/reports">Reports</Link>
      <Link href="@/app/pages/settings">Settings</Link>
      <Link href="@/app/pages/users">Users</Link>
    </nav>
  );
}
