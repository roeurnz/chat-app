import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';

import { MessageCircle } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }


  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar
          selectedRoomId={selectedRoomId}
          onRoomSelect={setSelectedRoomId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1">
        {selectedRoomId ? (
          <ChatWindow roomId={selectedRoomId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to Telegram Clone</h2>
            <p className="text-muted-foreground mb-6">
              Select a chat from the sidebar or create a new room to start messaging
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Index;
