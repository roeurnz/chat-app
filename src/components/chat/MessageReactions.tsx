import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { MessageReaction } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  onReactionsUpdate: (reactions: MessageReaction[]) => void;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

export function MessageReactions({ messageId, reactions, onReactionsUpdate }: MessageReactionsProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction]) {
      acc[reaction.reaction] = [];
    }
    acc[reaction.reaction].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const addReaction = async (emoji: string) => {
    if (!profile) return;

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      r => r.user_id === profile.id && r.reaction === emoji
    );

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (error) {
        toast({ title: "Error", description: "Failed to remove reaction", variant: "destructive" });
        return;
      }

      onReactionsUpdate(reactions.filter(r => r.id !== existingReaction.id));
    } else {
      // Add reaction
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: profile.id,
          reaction: emoji
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to add reaction", variant: "destructive" });
        return;
      }

      onReactionsUpdate([...reactions, data as MessageReaction]);
    }

    setShowPicker(false);
  };

  const hasUserReacted = (emoji: string) => {
    return reactions.some(r => r.user_id === profile?.id && r.reaction === emoji);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
        <Button
          key={emoji}
          variant={hasUserReacted(emoji) ? "default" : "secondary"}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => addReaction(emoji)}
        >
          <span className="mr-1">{emoji}</span>
          <span>{reactionList.length}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                onClick={() => addReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
