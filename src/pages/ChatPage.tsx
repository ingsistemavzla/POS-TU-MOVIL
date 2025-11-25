import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Sparkles, 
  MessageCircle, 
  Settings,
  Zap,
  Lightbulb,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Store
} from "lucide-react";

function ChatPageContent() {
  const { userProfile, company } = useAuth();
  const { currentSession, sendMessage, createSession } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChat, setShowChat] = useState(false);

  // Auto-show chat when there are messages
  useEffect(() => {
    if (currentSession && currentSession.messages.length > 0) {
      setShowChat(true);
    }
  }, [currentSession?.messages.length]);

  const quickPrompts = [
    {
      icon: TrendingUp,
      title: "Análisis de Ventas",
      description: "Analiza las tendencias de ventas y obtén insights",
      prompt: "Analiza las ventas de los últimos 30 días y dame recomendaciones para mejorar"
    },
    {
      icon: ShoppingCart,
      title: "Optimización POS",
      description: "Mejora la eficiencia del punto de venta",
      prompt: "¿Cómo puedo optimizar el proceso de ventas en el POS?"
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Optimiza el control de inventario",
      prompt: "Dame consejos para mejorar la gestión de inventario"
    },
    {
      icon: Users,
      title: "Análisis de Clientes",
      description: "Entiende mejor a tus clientes",
      prompt: "¿Cómo puedo mejorar la experiencia del cliente?"
    },
    {
      icon: Store,
      title: "Gestión de Tiendas",
      description: "Optimiza la operación de múltiples tiendas",
      prompt: "Dame estrategias para gestionar múltiples tiendas eficientemente"
    },
    {
      icon: Lightbulb,
      title: "Ideas de Negocio",
      description: "Genera nuevas ideas para tu negocio",
      prompt: "Sugiere ideas innovadoras para expandir mi negocio"
    }
  ];

  return (
    <div className="h-screen flex bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden`}>
        <ChatSidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border/50 glass-card flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Asistente IA</h1>
                <p className="text-xs text-muted-foreground">
                  {company?.name} - POS Multitienda
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover-glow"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            {showChat && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowChat(false)}
                className="hover-glow"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="hover-glow">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Welcome Screen or Chat Interface */}
        {(!showChat && (!currentSession || currentSession?.messages.length === 0)) ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
              {/* Welcome Header */}
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  ¡Hola, {userProfile?.name}!
                </h2>
                <p className="text-lg text-muted-foreground mb-2">
                  Soy tu asistente IA personal para el sistema POS
                </p>
                <p className="text-sm text-muted-foreground">
                  Puedo ayudarte con análisis, optimizaciones y cualquier consulta sobre tu negocio
                </p>
              </div>

              {/* Quick Prompts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickPrompts.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <div
                      key={index}
                      className="group relative p-6 rounded-xl glass-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow cursor-pointer"
                      onClick={async () => {
                        if (!currentSession) {
                          createSession(prompt.title);
                        }
                        setShowChat(true);
                        await sendMessage(prompt.prompt);
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                            {prompt.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {prompt.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Zap className="w-3 h-3 text-primary" />
                            <span className="text-xs text-primary font-medium">
                              Prompt rápido
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  );
                })}
              </div>

              {/* Start Chat CTA */}
              <div className="text-center mt-12">
                <Button
                  onClick={() => {
                    if (!currentSession) {
                      createSession("Nueva conversación");
                    }
                    setShowChat(true);
                  }}
                  className="btn-premium bg-gradient-primary hover:shadow-glow-accent"
                  size="lg"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comenzar conversación
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  );
}
