import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  metadata?: {
    type?: 'text' | 'chart' | 'table' | 'code';
    data?: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

type ChatAction =
  | { type: 'CREATE_SESSION'; payload: { title: string } }
  | { type: 'SET_CURRENT_SESSION'; payload: { sessionId: string } }
  | { type: 'ADD_MESSAGE'; payload: { sessionId: string; message: ChatMessage } }
  | { type: 'UPDATE_MESSAGE'; payload: { sessionId: string; messageId: string; updates: Partial<ChatMessage> } }
  | { type: 'DELETE_SESSION'; payload: { sessionId: string } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ChatState['settings']> }
  | { type: 'CLEAR_SESSION'; payload: { sessionId: string } };

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  error: null,
  settings: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  },
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'CREATE_SESSION':
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: action.payload.title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      return {
        ...state,
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession.id,
      };

    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSessionId: action.payload.sessionId,
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.sessionId
            ? {
                ...session,
                messages: [...session.messages, action.payload.message],
                updatedAt: new Date(),
              }
            : session
        ),
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.sessionId
            ? {
                ...session,
                messages: session.messages.map(message =>
                  message.id === action.payload.messageId
                    ? { ...message, ...action.payload.updates }
                    : message
                ),
                updatedAt: new Date(),
              }
            : session
        ),
      };

    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== action.payload.sessionId),
        currentSessionId: state.currentSessionId === action.payload.sessionId ? null : state.currentSessionId,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'CLEAR_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.sessionId
            ? { ...session, messages: [], updatedAt: new Date() }
            : session
        ),
      };

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  currentSession: ChatSession | null;
  createSession: (title: string) => void;
  sendMessage: (content: string) => Promise<void>;
  deleteSession: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const currentSession = state.sessions.find(session => session.id === state.currentSessionId) || null;

  const createSession = (title: string) => {
    dispatch({ type: 'CREATE_SESSION', payload: { title } });
  };

  const sendMessage = async (content: string) => {
    let sessionToUse = currentSession;
    
    if (!sessionToUse) {
      createSession('Nueva conversación');
      // Wait for the session to be created
      setTimeout(() => {
        const newSession = state.sessions.find(s => s.id === state.currentSessionId);
        if (newSession) {
          sendMessageToSession(newSession.id, content);
        }
      }, 100);
      return;
    }

    sendMessageToSession(sessionToUse.id, content);
  };

  const sendMessageToSession = async (sessionId: string, content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    dispatch({ type: 'ADD_MESSAGE', payload: { sessionId, message: userMessage } });

    // Simulate AI response
    dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });

    // Generate more specific responses based on content
    let response = '';
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('venta') || lowerContent.includes('ventas')) {
      response = `Excelente pregunta sobre ventas. Para analizar las ventas de tu sistema POS, puedo ayudarte con:

📊 **Análisis de Tendencias:**
- Ventas por período (diario, semanal, mensual)
- Productos más vendidos
- Horarios pico de ventas
- Comparación entre tiendas

💡 **Recomendaciones:**
- Identificar productos de bajo rendimiento
- Optimizar horarios de personal
- Estrategias de promoción basadas en datos

¿Te gustaría que profundice en algún aspecto específico de las ventas?`;
    } else if (lowerContent.includes('inventario') || lowerContent.includes('stock')) {
      response = `Perfecto, la gestión de inventario es crucial. Te puedo ayudar con:

📦 **Control de Inventario:**
- Alertas de stock bajo
- Productos con exceso de inventario
- Rotación de productos
- Prevención de pérdidas

⚡ **Optimización:**
- Puntos de reorden automáticos
- Análisis ABC de productos
- Predicción de demanda
- Reducción de costos de almacenamiento

¿Qué aspecto del inventario te interesa más?`;
    } else if (lowerContent.includes('cliente') || lowerContent.includes('clientes')) {
      response = `¡Excelente enfoque en los clientes! Puedo ayudarte con:

👥 **Análisis de Clientes:**
- Segmentación por comportamiento
- Clientes más valiosos
- Patrones de compra
- Satisfacción del cliente

🎯 **Estrategias:**
- Programas de fidelización
- Marketing personalizado
- Mejora de experiencia
- Retención de clientes

¿Quieres que analice algún aspecto específico de tus clientes?`;
    } else if (lowerContent.includes('pos') || lowerContent.includes('punto de venta')) {
      response = `¡Optimicemos tu POS! Aquí tienes mis recomendaciones:

🛒 **Eficiencia del POS:**
- Flujo de trabajo optimizado
- Atajos de teclado
- Configuración de productos
- Gestión de cajeros

⚡ **Mejoras:**
- Tiempo de transacción
- Prevención de errores
- Integración con inventario
- Reportes en tiempo real

¿En qué área específica del POS quieres enfocarte?`;
    } else if (lowerContent.includes('tienda') || lowerContent.includes('tiendas')) {
      response = `¡Gestión multi-tienda! Te ayudo con:

🏪 **Operación Multi-tienda:**
- Comparación de rendimiento
- Distribución de inventario
- Estandarización de procesos
- Comunicación entre tiendas

📈 **Estrategias:**
- Centralización de datos
- Optimización de recursos
- Escalabilidad del negocio
- Control de calidad

¿Qué aspecto de la gestión multi-tienda te interesa?`;
    } else if (lowerContent.includes('negocio') || lowerContent.includes('expandir')) {
      response = `¡Ideas para expandir tu negocio! Aquí tienes algunas sugerencias:

🚀 **Oportunidades de Crecimiento:**
- Nuevos canales de venta (online, delivery)
- Diversificación de productos
- Franquicias o licencias
- Alianzas estratégicas

💡 **Innovación:**
- Tecnología de vanguardia
- Experiencia del cliente
- Sostenibilidad
- Automatización

¿Qué tipo de expansión te interesa más?`;
    } else {
      response = `¡Hola! Soy tu asistente IA especializado en sistemas POS. 

Puedo ayudarte con:
📊 **Análisis de ventas** y tendencias
📦 **Gestión de inventario** y optimización
👥 **Análisis de clientes** y fidelización
🛒 **Optimización del POS** y procesos
🏪 **Gestión multi-tienda** y escalabilidad
💡 **Ideas de negocio** y expansión

¿En qué puedo ayudarte específicamente?`;
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: response,
      role: 'assistant',
      timestamp: new Date(),
      status: 'sent',
    };

    // Simulate delay
    setTimeout(() => {
      dispatch({ type: 'ADD_MESSAGE', payload: { sessionId, message: assistantMessage } });
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }, 1000);
  };

  const deleteSession = (sessionId: string) => {
    dispatch({ type: 'DELETE_SESSION', payload: { sessionId } });
  };

  const clearSession = (sessionId: string) => {
    dispatch({ type: 'CLEAR_SESSION', payload: { sessionId } });
  };

  const value: ChatContextType = {
    state,
    dispatch,
    currentSession,
    createSession,
    sendMessage,
    deleteSession,
    clearSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
