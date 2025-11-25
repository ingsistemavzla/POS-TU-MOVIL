import { useState, useRef, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { ChatMessage } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  MoreVertical,
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatInterface() {
  const { currentSession, sendMessage, state } = useChat();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || state.isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-VE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-4xl mx-auto">
          {currentSession.messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Comienza la conversación!</h3>
              <p className="text-muted-foreground">
                Escribe tu primera pregunta y te ayudaré con tu sistema POS
              </p>
            </div>
          ) : (
            currentSession.messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} onCopy={copyToClipboard} />
            ))
          )}

          {/* Loading indicator */}
          {state.isLoading && (
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Asistente IA</span>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/50 glass-card p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="pr-12 resize-none"
                disabled={state.isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputValue("")}
                  className="h-6 w-6 p-0 hover:bg-muted"
                  disabled={!inputValue}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || state.isLoading}
              className="btn-premium bg-gradient-primary hover:shadow-glow-accent"
              size="default"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Presiona Enter para enviar</span>
              <span>•</span>
              <span>Shift + Enter para nueva línea</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>IA Asistente</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatMessageComponentProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
}

function ChatMessageComponent({ message, onCopy }: ChatMessageComponentProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex items-start space-x-4",
      isUser ? "flex-row-reverse space-x-reverse" : ""
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-gradient-to-r from-primary to-primary/80" 
          : "bg-gradient-to-r from-primary/20 to-primary/10"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "text-right" : ""
      )}>
        <div className={cn(
          "inline-block p-4 rounded-2xl",
          isUser
            ? "bg-gradient-to-r from-primary to-primary/80 text-white"
            : "bg-muted/50 border border-border/50"
        )}>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>

        {/* Message Actions */}
        <div className={cn(
          "flex items-center space-x-2 mt-2",
          isUser ? "justify-end" : "justify-start"
        )}>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          
          {!isUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(message.content)}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-VE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
