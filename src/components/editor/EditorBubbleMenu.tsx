import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorLinkDialog } from './EditorLinkDialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EDITOR_COLORS } from '@/lib/constants';

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updateMenu = () => {
      const { state } = editor;
      const { from, to, empty } = state.selection;
      
      if (empty) {
        setShow(false);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      
      setPosition({
        left: (start.left + end.left) / 2,
        top: start.top - 10
      });
      setShow(true);
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('transaction', updateMenu);
    updateMenu();
    
    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('transaction', updateMenu);
    };
  }, [editor]);

  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes('link').href;
    if (previousUrl) {
      editor.chain().focus().unsetLink().run();
    } else {
      setLinkDialogOpen(true);
    }
  };

  const handleSetLink = (url: string) => {
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  };

  const handleColorChange = (color: string) => {
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setColorPopoverOpen(false);
  };

  const BubbleButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-accent text-accent-foreground'
      )}
      title={title}
    >
      {children}
    </Button>
  );

  if (!show) return null;

  return (
    <>
      <div
        className="fixed z-overlay flex items-center gap-1 p-1 bg-popover border border-border rounded-lg shadow-soft"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <BubbleButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </BubbleButton>

        <BubbleButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </BubbleButton>

        <BubbleButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </BubbleButton>

        <BubbleButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </BubbleButton>

        <div className="w-px h-6 bg-border mx-1" />

        <BubbleButton
          onClick={handleLinkClick}
          isActive={editor.isActive('link')}
          title={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
        >
          <LinkIcon className="h-4 w-4" />
        </BubbleButton>

        <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center">
            <div className="grid grid-cols-4 gap-1">
              {EDITOR_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={cn(
                    'h-8 w-8 rounded border border-border hover:scale-110 transition-transform',
                    !color.value && 'bg-background'
                  )}
                  style={{ backgroundColor: color.value || 'transparent' }}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <EditorLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSave={handleSetLink}
        initialUrl={editor.getAttributes('link').href || ''}
      />
    </>
  );
}
