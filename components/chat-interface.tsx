import { ChatMessage, DocumentMetadata } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { FileText, Loader2, Send } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";


interface ChatInterfaceProps {
    onSendMessage: (message: string, documentId: string) => Promise<string>;
    loading: boolean;
    currentDocument?: DocumentMetadata;
}

// Helper function to load chat history from local storage
const getChatHistory = (documentId: string):ChatMessage[] => {
    const history = localStorage.getItem(`chat-history-${documentId}`);
    return history ? JSON.parse(history) : [];
}

//Helper function to save chat history to local storage
const saveChatHistory = (documentId: string, history: ChatMessage[]) => {
    localStorage.setItem(`chat-history-${documentId}`, JSON.stringify(history));
}
export function ChatInterface({
    onSendMessage,
    loading,
    currentDocument
}: ChatInterfaceProps) {

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState<string>('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load chat history when current document changes

    useEffect(() => {
        if (currentDocument?.id) {
            const history = getChatHistory(currentDocument.id);
            setMessages(history);
        } else {
            setMessages([]);
        }
    }, [currentDocument])

    // Save chat history when current document changes

    useEffect(() => {
        if (currentDocument?.id) {
            saveChatHistory(currentDocument.id, messages);

        }
    },[messages, currentDocument]);
    const handleSend = async() => {
        if (!input.trim() || loading || !currentDocument) return;

        const userMessage:ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input,
            timestamp: new Date(),
            documentId: currentDocument.id,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');

        // Get AI response
        const aiResponse = await onSendMessage(input, currentDocument.id);
        console.log(aiResponse);
        const aiMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
            documentId: currentDocument.id
        };

        setMessages((prev) => [...prev, aiMessage]);
        console.log(messages);
    };

    const clearHistory = () => {
        if (currentDocument?.id) {
            localStorage.removeItem(`chat-history-${currentDocument.id}`);
            setMessages([])
        }
    }

    return <Card className="h-[500px] flex flex-col">
        {currentDocument ? (
            <div className="p-3 border-b flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground"/>
                    <span className="text-sm text-muted-foreground">
                        Current Document: {currentDocument.filename}
                    </span>
                </div>
                {messages.length > 0 && (
                    <Button
                        variant={"ghost"}
                        // className="text-muted-foreground hover:text-destructive"
                        className="bg-indigo-500 text-primary-foreground hover:text-destructive"
                        onClick={clearHistory}
                >
                    Clear history
                </Button>
                )
                }
                
            </div>
        ): (
            <div className="p-3 border-b bg-yellow-500/10 text-yellow-900 dark:text-yellow-200">
                Por favor, selecciona o sube un documento para empezar a hacer preguntas.
            </div>
        )}

        <ScrollArea
            className="flex-1 p-4"
            ref={scrollRef}
        >
            <div className="space-y-4">
                {messages.map((message) => (
                    <div 
                        key={message.id}
                        className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                message.role === "user"
                                ? "bg-indigo-500 text-primary-foreground"
                                // ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <div className={`text-xs mt-1 ${
                                message.role === "user"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground/70"
                            }`}>{new Date(message.timestamp).toLocaleTimeString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="p-4 border-t">
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={
                        currentDocument
                        ? "Type a message"
                        : "Por favor, selecciona o sube un documento para empezar a hacer preguntas."
                    }
                    disabled= {loading || !currentDocument}
                />
                <Button
                    className="bg-indigo-500 text-primary-foreground"
                    onClick={handleSend} 
                    disabled= {loading || !currentDocument}
                >{ loading ? (<Loader2 className="animate-spin"/>) : (<Send/>) }</Button>
            </div>
        </div>
    </Card>
}