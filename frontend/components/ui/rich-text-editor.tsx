'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Unlink, ImageIcon,
  Undo, Redo, X,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const COLORS = [
  '#000000','#374151','#6b7280','#ef4444','#f97316',
  '#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff',
];

function ToolBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean;
  onClick: () => void; title: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors
        ${active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

export function RichTextEditor({ value, onChange, placeholder = 'Start typing…', minHeight = '240px' }: RichTextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl,  setLinkUrl]  = useState('');
  const [colorOpen, setColorOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline', rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' },
        allowBase64: true,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '');
  }, [value, editor]);

  const insertImage = useCallback((file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string }).run();
    reader.readAsDataURL(file);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) { editor.chain().focus().unsetLink().run(); }
    else {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkUrl(''); setLinkOpen(false);
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400 transition-colors">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ''; }} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <ToolBtn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo size={13} /></ToolBtn>
        <ToolBtn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo size={13} /></ToolBtn>
        <Sep />
        <ToolBtn title="Bold"          active={editor.isActive('bold')}   onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></ToolBtn>
        <ToolBtn title="Italic"        active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={13} /></ToolBtn>
        <ToolBtn title="Code"          active={editor.isActive('code')}   onClick={() => editor.chain().focus().toggleCode().run()}><Code size={13} /></ToolBtn>
        <Sep />
        <ToolBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={13} /></ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={13} /></ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={13} /></ToolBtn>
        <Sep />
        <ToolBtn title="Bullet list"   active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={13} /></ToolBtn>
        <ToolBtn title="Ordered list"  active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={13} /></ToolBtn>
        <ToolBtn title="Blockquote"    active={editor.isActive('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={13} /></ToolBtn>
        <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={13} /></ToolBtn>
        <Sep />
        <ToolBtn title="Align left"   active={editor.isActive({ textAlign: 'left' })}   onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={13} /></ToolBtn>
        <ToolBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={13} /></ToolBtn>
        <ToolBtn title="Align right"  active={editor.isActive({ textAlign: 'right' })}  onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={13} /></ToolBtn>
        <Sep />

        {/* Link */}
        <div className="relative">
          <ToolBtn title="Link" active={editor.isActive('link')} onClick={() => {
            setLinkUrl(editor.getAttributes('link').href || '');
            setLinkOpen(v => !v);
            setColorOpen(false);
          }}><Link2 size={13} /></ToolBtn>
          {linkOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3 w-64">
              <p className="text-[11px] text-gray-500 mb-1.5">Insert or edit link</p>
              <input autoFocus type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
                placeholder="https://example.com"
                className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 mb-2" />
              <div className="flex gap-2">
                <button type="button" onClick={applyLink}
                  className="px-3 py-1.5 bg-black text-white text-xs rounded-lg">
                  {editor.isActive('link') ? 'Update' : 'Add'} link
                </button>
                {editor.isActive('link') && (
                  <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
                    className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg flex items-center gap-1 text-gray-600">
                    <Unlink size={11} /> Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image */}
        <ToolBtn title="Insert image" onClick={() => fileRef.current?.click()}><ImageIcon size={13} /></ToolBtn>

        {/* Color */}
        <div className="relative">
          <ToolBtn title="Text color" onClick={() => { setColorOpen(v => !v); setLinkOpen(false); }}>
            <span className="text-[10px] font-bold" style={{ color: editor.getAttributes('textStyle').color || '#000' }}>A</span>
          </ToolBtn>
          {colorOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3">
              <div className="flex flex-wrap gap-1.5 w-40">
                {COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                    className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }} />
                ))}
                <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                  className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                  <X size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor}
        className="px-4 py-3 prose prose-sm max-w-none focus:outline-none"
        style={{ minHeight }} />
    </div>
  );
}
