import { Users, Crown, ShieldCheck, Boxes } from "lucide-react";
import type { TeamUser } from "@/lib/users/types";
import styles from "@/styles/users/UsersStats.module.css";

export default function UsersStats({ users }: { users: TeamUser[] }) {
  const count = (r: string) =>
    users.filter((u) => u.role.toLowerCase() === r.toLowerCase()).length;
  const pending = users.filter((u) => u.status === "Invited").length;

  const cards = [
    {
      id: "total",
      label: "Total Users",
      value: users.length,
      hint: `${pending} pending invite${pending === 1 ? "" : "s"}`,
      icon: Users,
    },
    {
      id: "owner",
      label: "Owner",
      value: count("owner"),
      hint: "Account creator",
      icon: Crown,
    },
    {
      id: "admin",
      label: "Admins",
      value: count("admin"),
      hint: "Can configure the account",
      icon: ShieldCheck,
    },
    {
      id: "staff",
      label: "Staff",
      value: count("staff"),
      hint: "Stock management only",
      icon: Boxes,
    },
  ];

  return (
    <section className={styles.statGrid} aria-label="User summary">
      {cards.map(({ id, label, value, hint, icon: Icon }) => (
        <article key={id} className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statIcon}>
              <Icon size={14} aria-hidden />
            </span>
          </div>
          <div className={styles.statValue}>{value}</div>
          <div className={styles.statHint}>{hint}</div>
        </article>
      ))}
    </section>
  );
}
