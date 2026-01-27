import { useAuth } from "./useAuth";

export function useUserRole() {
  const { userRole } = useAuth();
  
  return {
    userRole,
    isAdmin: userRole === "admin",
    isMember: userRole === "member",
  };
}
