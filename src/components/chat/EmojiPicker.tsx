import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const EMOJI_CATEGORIES = {
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  hands: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💍', '💎'],
  objects: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋'],
};

const GIFS = [
  { id: '1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', title: 'Dance' },
  { id: '2', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', title: 'Happy' },
  { id: '3', url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif', title: 'Excited' },
  { id: '4', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPVT72/giphy.gif', title: 'Thumbs Up' },
  { id: '5', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Wave' },
  { id: '6', url: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif', title: 'Love' },
];

const STICKERS = [
  { id: '1', url: 'https://stickerly.pstatic.net/sticker_pack/6GkJHjBJcHOzAaFtlri7/TCWLRR/1/64e7bf28-ec56-4c6c-9b03-e7c6f1a5f0e5.png', title: 'Happy Cat' },
  { id: '2', url: 'https://stickerly.pstatic.net/sticker_pack/6GkJHjBJcHOzAaFtlri7/TCWLRR/2/64e7bf28-ec56-4c6c-9b03-e7c6f1a5f0e6.png', title: 'Cute Dog' },
  { id: '3', url: 'https://stickerly.pstatic.net/sticker_pack/6GkJHjBJcHOzAaFtlri7/TCWLRR/3/64e7bf28-ec56-4c6c-9b03-e7c6f1a5f0e7.png', title: 'Love Bear' },
  { id: '4', url: 'https://stickerly.pstatic.net/sticker_pack/6GkJHjBJcHOzAaFtlri7/TCWLRR/4/64e7bf28-ec56-4c6c-9b03-e7c6f1a5f0e8.png', title: 'Cool Panda' },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (gif: { url: string; title: string }) => void;
  onStickerSelect: (sticker: { url: string; title: string }) => void;
  trigger: React.ReactNode;
}

export function EmojiPicker({ onEmojiSelect, onGifSelect, onStickerSelect, trigger }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  const handleGifClick = (gif: { url: string; title: string }) => {
    onGifSelect(gif);
    setOpen(false);
  };

  const handleStickerClick = (sticker: { url: string; title: string }) => {
    onStickerSelect(sticker);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="end">
        <Tabs defaultValue="emojis" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emojis">😀</TabsTrigger>
            <TabsTrigger value="gifs">GIF</TabsTrigger>
            <TabsTrigger value="stickers">🎭</TabsTrigger>
          </TabsList>
          
          <TabsContent value="emojis" className="p-2">
            <div className="space-y-2">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-lg hover:bg-muted"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="gifs" className="p-2">
            <ScrollArea className="h-64">
              <div className="grid grid-cols-2 gap-2">
                {GIFS.map((gif) => (
                  <div
                    key={gif.id}
                    className="cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-primary"
                    onClick={() => handleGifClick(gif)}
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      className="w-full h-20 object-cover"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="stickers" className="p-2">
            <ScrollArea className="h-64">
              <div className="grid grid-cols-3 gap-2">
                {STICKERS.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-primary p-2 hover:bg-muted"
                    onClick={() => handleStickerClick(sticker)}
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.title}
                      className="w-full h-16 object-contain"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}