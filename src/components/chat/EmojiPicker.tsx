import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EMOJI_CATEGORIES } from '@/components/chat/emojiData';
import { Input } from '@/components/ui/input';
import { GIF_CATEGORIES } from '@/components/chat/gifData';
import { STICKERS } from '@/components/chat/stickerData';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (gif: { url: string; title: string }) => void;
  onStickerSelect: (sticker: { url: string; title: string }) => void;
  trigger: React.ReactNode;
}

export function EmojiPicker({ onEmojiSelect, onGifSelect, onStickerSelect, trigger }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('emojis');

  // Filter emojis
  const filteredEmojis = Object.entries(EMOJI_CATEGORIES).reduce((acc, [category, emojis]) => {
    const filtered = emojis.filter(emoji => 
      emoji.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emoji.emoji.includes(searchTerm)
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof EMOJI_CATEGORIES);

  // Filter GIFs
  const filteredGifs = Object.entries(GIF_CATEGORIES).reduce((acc, [category, gifs]) => {
    const filtered = gifs.filter(gif => 
      gif.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gif.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof GIF_CATEGORIES);

  // Filter stickers
  const filteredStickers = STICKERS.filter(sticker =>
    sticker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sticker.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="end">
        <Tabs defaultValue="emojis" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emojis">😀</TabsTrigger>
            <TabsTrigger value="gifs">GIF</TabsTrigger>
            <TabsTrigger value="stickers">🎭</TabsTrigger>
          </TabsList>

          <TabsContent value="emojis" className="p-2">
            <div className="px-1 pb-2">
              <Input
                placeholder="Search emojis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {Object.entries(filteredEmojis).map(([category, emojis]) => (
                  <div key={category}>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h3>
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.map((emoji) => (
                        <Button 
                          key={emoji.emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg hover:bg-muted"
                          onClick={() => handleEmojiClick(emoji.emoji)}
                        >
                          {emoji.emoji}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gifs" className="p-2">
            <div className="px-1 pb-2">
              <Input
                placeholder="Search GIFs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {Object.entries(filteredGifs).map(([category, gifs]) => (
                  <div key={category}>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 ml-1">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {gifs.map((gif) => (
                        <div
                          key={gif.id}
                          className="cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-primary"
                          onClick={() => handleGifClick({ url: gif.url, title: gif.title })}
                        >
                          <img
                            src={gif.url}
                            alt={gif.title}
                            className="w-full h-20 object-cover"
                          />
                          <p className="text-xs text-center truncate px-1 py-1">{gif.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stickers" className="p-2">
            <div className="px-1 pb-2">
              <Input
                placeholder="Search stickers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-3 gap-2">
                {filteredStickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-primary p-2 hover:bg-muted"
                    onClick={() => handleStickerClick({ url: sticker.url, title: sticker.title })}
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