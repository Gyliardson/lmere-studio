import type { ReactNode } from "react";
import "./admin.css";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="admin-shell">{children}</div>;
}
