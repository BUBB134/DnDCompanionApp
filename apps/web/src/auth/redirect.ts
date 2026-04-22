import { redirect } from "next/navigation";
import type { ProtectedReturnPath } from "@/auth/session";

export function redirectToProtectedPath(path: ProtectedReturnPath): never {
  switch (path) {
    case "/campaigns":
      redirect("/campaigns");
    case "/entities":
      redirect("/entities");
    case "/rules":
      redirect("/rules");
    case "/sessions":
      redirect("/sessions");
    case "/":
      redirect("/");
  }
}
