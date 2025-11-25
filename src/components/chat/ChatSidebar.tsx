import { useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  Trash2, 
  MessageSquare, 
  Settings,
  Bot,
  Sparkles,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const { state, currentSession, createSession, deleteSession, clearSession, dispatch } = useChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const filteredSessions = state.sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Ahora";
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours}h`;
    } else {
      return date.toLocaleDateString('es-VE', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleNewChat = () => {
    createSession("Nueva conversación");
  };

  const handleSessionClick = (sessionId: string) => {
    // Dispatch action to set current session
    dispatch({ type: 'SET_CURRENT_SESSION', payload: { sessionId } });
  };

  if (!isOpen) {
    return (
      <div className="w-16 bg-background border-r border-border/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="mb-4 hover-glow"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="flex-1 flex flex-col items-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="w-10 h-10 p-0 hover-glow"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-r border-border/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold">Chat IA</h2>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="hover-glow"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="hover-glow"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          className="w-full btn-premium bg-gradient-primary hover:shadow-glow-accent"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva conversación
        </Button>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No se encontraron conversaciones" : "No hay conversaciones"}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSession?.id === session.id}
                onClick={() => handleSessionClick(session.id)}
                onDelete={() => deleteSession(session.id)}
                onClear={() => clearSession(session.id)}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <h3 className="font-semibold mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Modelo IA</label>
              <select className="w-full mt-1 p-2 text-sm border border-border rounded-md bg-background">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5">GPT-3.5</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Temperatura</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.7"
                className="w-full mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>Asistente IA v1.0</span>
        </div>
      </div>
    </div>
  );
}

interface SessionItemProps {
  session: any;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onClear: () => void;
  formatDate: (date: Date) => string;
}

function SessionItem({ session, isActive, onClick, onDelete, onClear, formatDate }: SessionItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
        isActive
          ? "bg-primary/20 border border-primary/30"
          : "hover:bg-muted/50 border border-transparent"
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {session.title}
          </h4>
          <div className="flex items-center space-x-2 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDate(session.updatedAt)}
            </span>
            {session.messages.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {session.messages.length} mensajes
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={cn(
          "flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity",
          showActions && "opacity-100"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
