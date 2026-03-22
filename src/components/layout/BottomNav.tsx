import { Home, Users, TrendingUp, Upload, GraduationCap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Dashboard */}
          <Button
            variant="ghost"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3",
              isActive("/") && "text-primary"
            )}
            onClick={() => navigate("/")}
          >
            <Home className={cn("h-5 w-5", isActive("/") && "text-primary")} />
            <span className="text-xs">Início</span>
          </Button>

          {/* Usuários */}
          <Button
            variant="ghost"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3",
              (isActive("/users") || isActive("/register") || isActive("/upload-users")) &&
                "text-primary"
            )}
            onClick={() => navigate("/users")}
          >
            <Users
              className={cn(
                "h-5 w-5",
                (isActive("/users") || isActive("/register") || isActive("/upload-users")) &&
                  "text-primary"
              )}
            />
            <span className="text-xs">Usuários</span>
          </Button>

          {/* Indicadores */}
          <Button
            variant="ghost"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3",
              (isActive("/performance") || isActive("/upload-performance")) && "text-primary"
            )}
            onClick={() => navigate("/performance")}
          >
            <TrendingUp
              className={cn(
                "h-5 w-5",
                (isActive("/performance") || isActive("/upload-performance")) && "text-primary"
              )}
            />
            <span className="text-xs">Indicadores</span>
          </Button>

          {/* Treinamentos */}
          <Button
            variant="ghost"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3",
              (isActive("/trainings") || isActive("/trainings/create") || location.pathname.includes("/trainings/")) &&
                "text-primary"
            )}
            onClick={() => navigate("/trainings")}
          >
            <GraduationCap
              className={cn(
                "h-5 w-5",
                (isActive("/trainings") || isActive("/trainings/create") || location.pathname.includes("/trainings/")) &&
                  "text-primary"
              )}
            />
            <span className="text-xs">Treinamentos</span>
          </Button>

          {/* Menu de Upload */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-1 h-auto py-2 px-3"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="mb-2">
              <DropdownMenuItem onClick={() => navigate("/upload-users")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV - Usuários
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/upload-performance")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV - Indicadores
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

