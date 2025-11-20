import React, { useState, useRef, useEffect } from 'react';
import { Course, CourseBlock, BlockType } from '../types';
import { Plus, Image as ImageIcon, Type, Youtube, Wand2, Video, Loader2, ChevronLeft, Sparkles, LayoutTemplate, Bold, Italic, List, Folder, Link as LinkIcon, Trash2, Upload, Search, GripVertical, Heading1, Heading2, Heading3, Quote, Code, CheckSquare, Minus, AlignLeft, MoreHorizontal, Table, FileCode, Tag, X } from 'lucide-react';
import { enrichBlockContent, generateCoverImage, generateCourseStructure, analyzeVideoContent } from '../services/gemini';

interface CreatorStudioProps {
  initialCourse?: Course;
  onSave: (course: Course) => void;
  onCancel: () => void;
}

// Helper for Tabs logic
interface TabItem {
    label: string;
    content: string;
    icon?: string; // Emoji or icon name
    image?: string; // Background image for the content pane
}

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ initialCourse, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Drag and Drop State
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  
  // Tab Editing State
  const [activeTabEdits, setActiveTabEdits] = useState<{[blockId: string]: number}>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const headerBgUploadRef = useRef<HTMLInputElement>(null);

  const [activeImageBlockId, setActiveImageBlockId] = useState<string | null>(null);
  const [activeHeaderBlockId, setActiveHeaderBlockId] = useState<string | null>(null);

  // Load initial data if editing
  useEffect(() => {
      if (initialCourse) {
          setTitle(initialCourse.title);
          setDescription(initialCourse.description);
          setCategory(initialCourse.category || '');
          setCoverImage(initialCourse.coverImage);
          setBlocks(initialCourse.blocks);
      }
  }, [initialCourse]);

  // Helper: YouTube ID
  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // AI: Architect Mode
  const handleArchitect = async () => {
    if (!title) return;
    setIsThinking(true);
    try {
        const structureStr = await generateCourseStructure(title);
        const structure = JSON.parse(structureStr);
        
        if (!title && structure.title) setTitle(structure.title);
        if (!description && structure.description) setDescription(structure.description);
        
        if (structure.acts && Array.isArray(structure.acts)) {
            const newBlocks: CourseBlock[] = structure.acts.map((act: any, idx: number) => ({
                id: `gen-${Date.now()}-${idx}`,
                type: BlockType.HEADER,
                content: act.title,
                metadata: { description: act.description }
            }));
            setBlocks(prev => [...prev, ...newBlocks]);
        }
    } catch (e) {
        console.error("Failed to parse architect response", e);
    }
    setIsThinking(false);
  };

  // --- Cover Image Tools ---

  const handleGenerateCover = async () => {
      if (!title) return;
      setIsGeneratingImage(true);
      const imgUrl = await generateCoverImage(title + " " + description);
      if (imgUrl) setCoverImage(imgUrl);
      setIsGeneratingImage(false);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setCoverImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleCoverUnsplash = () => {
      const keyword = prompt("Skriv inn et søkeord for Unsplash (f.eks. 'Fjell', 'Kaffe'):");
      if (keyword) {
          setCoverImage(`https://source.unsplash.com/featured/1600x900?${encodeURIComponent(keyword)}`);
      }
  };

  const handleCoverUrl = () => {
      const url = prompt("Lim inn bilde-URL:");
      if (url) setCoverImage(url);
  };

  // --- BLOCK TOOLS ---

  const addTextBlock = () => {
      setBlocks([...blocks, { 
          id: Date.now().toString(), 
          type: BlockType.TEXT, 
          content: "",
      }]);
  };

  const addHeaderBlock = () => {
      setBlocks([...blocks, {
          id: Date.now().toString(),
          type: BlockType.HEADER,
          content: "Ny Akt",
          metadata: { description: "Beskrivelse av seksjonen..." }
      }]);
  };

  const addTabsBlock = () => {
      const initialTabs: TabItem[] = [
          { label: 'Steg 1', content: 'Beskrivelse av første steg...', icon: '1' },
          { label: 'Steg 2', content: 'Mer informasjon her...', icon: '2' }
      ];
      setBlocks([...blocks, {
          id: Date.now().toString(),
          type: BlockType.TABS,
          content: JSON.stringify(initialTabs)
      }]);
  };

  const addVideoBlock = async () => {
      const url = prompt("Lim inn YouTube URL:", "https://www.youtube.com/watch?v=...");
      if (!url) return;

      const videoId = getYouTubeID(url);
      const initialTitle = videoId ? "Henter metadata..." : "Videoblokk";
      const initialDesc = videoId ? "Gemini analyserer..." : "Lim inn en gyldig YouTube URL";

      const tempId = Date.now().toString();
      const newBlock: CourseBlock = { 
          id: tempId, 
          type: BlockType.VIDEO, 
          content: url, 
          metadata: { title: initialTitle, description: initialDesc } 
      };
      
      setBlocks(prev => [...prev, newBlock]);

      if (videoId) {
        const metadata = await enrichBlockContent(url);
        setBlocks(prev => prev.map(b => b.id === tempId ? { ...b, metadata } : b));
      }
  };

  const addImageBlock = () => {
      setBlocks([...blocks, {
          id: Date.now().toString(),
          type: BlockType.IMAGE,
          content: '',
          metadata: { caption: '' }
      }]);
  };

  // Image Helpers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeImageBlockId) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          updateBlockContent(activeImageBlockId, reader.result as string);
          setActiveImageBlockId(null);
      };
      reader.readAsDataURL(file);
  };

  const handlePasteImageURL = (id: string) => {
      const url = prompt("Lim inn Bilde-URL:");
      if (url) updateBlockContent(id, url);
  };

  const handleUnsplashImage = (id: string) => {
      const keyword = prompt("Skriv inn et søkeord for Unsplash:");
      if (keyword) {
          updateBlockContent(id, `https://source.unsplash.com/featured/1200x800?${encodeURIComponent(keyword)}`);
      }
  };
  
  // Header Background Helpers
  const handleHeaderBgUploadClick = (blockId: string) => {
      setActiveHeaderBlockId(blockId);
      headerBgUploadRef.current?.click();
  };

  const handleHeaderBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeHeaderBlockId) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          updateBlockMetadata(activeHeaderBlockId, 'backgroundImage', reader.result as string);
          setActiveHeaderBlockId(null);
          if(headerBgUploadRef.current) headerBgUploadRef.current.value = ''; // reset
      };
      reader.readAsDataURL(file);
  };

  const handleHeaderBackgroundUnsplash = (id: string) => {
      const keyword = prompt("Skriv inn et søkeord for bakgrunnen (f.eks. 'Abstrakt', 'Skyer'):");
      if (keyword) {
          updateBlockMetadata(id, 'backgroundImage', `https://source.unsplash.com/featured/1600x900?${encodeURIComponent(keyword)}`);
      }
  };
  
  const handleHeaderBackgroundUrl = (id: string) => {
      const url = prompt("Lim inn URL til bakgrunnsbilde:");
      if (url) updateBlockMetadata(id, 'backgroundImage', url);
  };

  // Video Analysis
  const handleVideoAnalysis = () => {
    fileInputRef.current?.click();
  };

  const processVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempId = Date.now().toString();
    setBlocks(prev => [...prev, { 
        id: tempId, 
        type: BlockType.TEXT, 
        content: "Analyserer videoinnhold med Gemini 3 Pro...", 
        metadata: { title: "Videoanalyse" } 
    }]);

    const analysis = await analyzeVideoContent(file, "Analyze this video. Provide a summary in Norwegian.");
    setBlocks(prev => prev.map(b => b.id === tempId ? { ...b, content: analysis } : b));
  };

  // Generic Updates
  const updateBlockContent = (id: string, newContent: string) => {
      // Check for auto-conversion of YouTube links in Text blocks
      const block = blocks.find(b => b.id === id);
      if (block && block.type === BlockType.TEXT) {
          const trimmed = newContent.trim();
          // Strict check: Content must be ONLY a YouTube URL (no spaces, no newlines)
          const isYouTubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(trimmed);
          const hasSpace = trimmed.includes(' ') || trimmed.includes('\n');

          if (isYouTubeUrl && !hasSpace) {
              const videoId = getYouTubeID(trimmed);
              if (videoId) {
                   // Convert to Video Block
                   setBlocks(prev => prev.map(b => {
                       if (b.id === id) {
                           return {
                               ...b,
                               type: BlockType.VIDEO,
                               content: trimmed,
                               metadata: { title: "Henter video...", description: "Laster metadata..." }
                           };
                       }
                       return b;
                   }));
                   
                   // Enrich with metadata
                   enrichBlockContent(trimmed).then(metadata => {
                        setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata } : b));
                   });
                   return;
              }
          }
      }

      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  const updateBlockMetadata = (id: string, field: string, value: string | undefined) => {
    setBlocks(blocks.map(b => {
        if (b.id === id) {
            const newMeta = { ...b.metadata };
            if (value === undefined) {
                delete newMeta[field as keyof typeof newMeta];
            } else {
                (newMeta as any)[field] = value;
            }
            return { ...b, metadata: newMeta };
        }
        return b;
    }));
  };

  const removeBlock = (id: string) => {
      setBlocks(blocks.filter(b => b.id !== id));
  };

  // --- Drag and Drop Logic for Blocks ---
  const handleDragStart = (index: number) => {
      setDraggedBlockIndex(index);
  };

  const handleDragEnter = (index: number) => {
      if (draggedBlockIndex === null || draggedBlockIndex === index) return;
      
      const newBlocks = [...blocks];
      const draggedItem = newBlocks[draggedBlockIndex];
      newBlocks.splice(draggedBlockIndex, 1);
      newBlocks.splice(index, 0, draggedItem);
      
      setDraggedBlockIndex(index);
      setBlocks(newBlocks);
  };

  const handleDragEnd = () => {
      setDraggedBlockIndex(null);
  };

  // --- Rich Text Toolbar ---
  const insertMarkdown = (id: string, currentContent: string, type: string) => {
      let insertion = '';
      switch(type) {
          case 'bold': insertion = ' **fet tekst** '; break;
          case 'italic': insertion = ' *kursiv* '; break;
          case 'h1': insertion = '\n# Overskrift 1\n'; break;
          case 'h2': insertion = '\n## Overskrift 2\n'; break;
          case 'h3': insertion = '\n### Overskrift 3\n'; break;
          case 'list': insertion = '\n- Listeobjekt'; break;
          case 'list-ol': insertion = '\n1. Listeobjekt'; break;
          case 'check': insertion = '\n- [ ] Oppgave'; break;
          case 'quote': insertion = '\n> Sitat\n'; break;
          case 'code-block': insertion = '\n```\nKodeblokk\n```\n'; break;
          case 'inline-code': insertion = ' `kode` '; break;
          case 'link': insertion = ' [Link Tittel](url) '; break;
          case 'hr': insertion = '\n---\n'; break;
          case 'table': insertion = '\n| Overskrift 1 | Overskrift 2 |\n|---|---|\n| Celle 1 | Celle 2 |\n'; break;
      }
      updateBlockContent(id, currentContent + insertion);
  };

  const MarkdownToolbar: React.FC<{ blockId: string, content: string }> = ({ blockId, content }) => (
      <div className="flex flex-wrap gap-1 border-b border-stone-100 pb-2 mb-2 bg-stone-50/50 p-2 rounded-lg">
          <button onClick={() => insertMarkdown(blockId, content, 'h1')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Overskrift 1"><Heading1 className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'h2')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Overskrift 2"><Heading2 className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'h3')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Overskrift 3"><Heading3 className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'bold')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Fet"><Bold className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'italic')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Kursiv"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'list')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Punktliste"><List className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'check')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Sjekkliste"><CheckSquare className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'quote')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Sitat"><Quote className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'inline-code')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Inline Kode"><FileCode className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'code-block')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Kodeblokk"><Code className="w-4 h-4" /></button>
           <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'table')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Sett inn tabell"><Table className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'link')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Link"><LinkIcon className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'hr')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Linjeskift"><Minus className="w-4 h-4" /></button>
      </div>
  );

  const handlePublish = () => {
      onSave({
          id: initialCourse?.id || Date.now().toString(),
          title: title || "Navnløst Kurs",
          description: description || "Ingen beskrivelse.",
          category: category || "Originalt Kurs",
          coverImage: coverImage,
          blocks
      });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20">
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={processVideoFile} />
      <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      <input type="file" ref={coverUploadRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
      <input type="file" ref={headerBgUploadRef} className="hidden" accept="image/*" onChange={handleHeaderBgFileChange} />

      {/* Top Bar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-stone-200 px-6 py-4 flex justify-between items-center z-40">
          <div className="flex items-center space-x-4">
              <button onClick={onCancel} className="p-2 hover:bg-stone-100 rounded-full transition">
                  <ChevronLeft className="w-5 h-5 text-stone-500" />
              </button>
              <span className="text-xs font-bold tracking-widest uppercase text-stone-400">Skaperstudio</span>
          </div>
          <button 
            onClick={handlePublish}
            className="bg-stone-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition"
          >
              {initialCourse ? 'Lagre Endringer' : 'Publiser Kurs'}
          </button>
      </div>

      <div className="max-w-3xl mx-auto mt-12 px-6">
          
          {/* Header / Metadata Editor */}
          <div className="group relative mb-12 space-y-6">
              <input
                type="text"
                placeholder="Skriv inn kurstittel..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-5xl font-serif bg-transparent outline-none placeholder-stone-300 text-stone-900"
              />
              
              <div className="flex items-center space-x-2 text-stone-400 bg-stone-100/50 px-3 py-2 rounded-lg w-fit">
                  <Tag className="w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="Kategori / Tag (f.eks. Historie)"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-transparent outline-none text-sm text-stone-600 placeholder-stone-400 w-64"
                  />
              </div>

              <textarea
                placeholder="Legg til en poetisk beskrivelse..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xl font-light bg-transparent outline-none placeholder-stone-300 text-stone-600 resize-none h-24"
              />
              
              <div className="flex flex-wrap gap-3 items-center">
                 <button 
                    onClick={handleArchitect}
                    disabled={isThinking || !title}
                    className="flex items-center space-x-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition disabled:opacity-50"
                 >
                    {isThinking ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3" />}
                    <span>Auto-Struktur</span>
                 </button>
                 
                 <div className="h-6 w-px bg-stone-200 mx-2"></div>
                 <span className="text-xs uppercase tracking-wider text-stone-400">Forsidebilde:</span>

                 <button 
                    onClick={handleGenerateCover}
                    disabled={isGeneratingImage || !title}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition disabled:opacity-50"
                    title="Generer med AI"
                 >
                    {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                    <span>AI Gen</span>
                 </button>

                 <button 
                    onClick={() => coverUploadRef.current?.click()}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Last opp fil"
                 >
                    <Upload className="w-3 h-3" />
                    <span>Last opp</span>
                 </button>

                 <button 
                    onClick={handleCoverUnsplash}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Søk Unsplash"
                 >
                    <Search className="w-3 h-3" />
                    <span>Unsplash</span>
                 </button>

                 <button 
                    onClick={handleCoverUrl}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Lim inn URL"
                 >
                    <LinkIcon className="w-3 h-3" />
                 </button>
              </div>

              {coverImage && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md mt-4 group-hover:shadow-lg transition-shadow">
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <button onClick={() => setCoverImage('')} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500/80 transition backdrop-blur-sm">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                  </div>
              )}
          </div>

          {/* Blocks Editor */}
          <div className="space-y-6">
              {blocks.map((block, idx) => (
                  <div 
                    key={block.id} 
                    className={`group relative transition-all duration-200 p-6 border rounded-xl ${draggedBlockIndex === idx ? 'bg-stone-100 opacity-50 border-stone-300 border-dashed' : 'bg-white hover:shadow-xl border-transparent hover:border-stone-200'}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                      {/* Drag Handle */}
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 p-1">
                          <GripVertical className="w-5 h-5" />
                      </div>
                      
                      {/* Block Tools */}
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 z-10">
                          <button onClick={() => removeBlock(block.id)} className="text-stone-300 hover:text-red-500 transition p-1 bg-white rounded-full shadow-sm">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>

                      <div className="pl-6">
                        {/* Text Block */}
                        {block.type === BlockType.TEXT && (
                            <div className="space-y-2">
                                <MarkdownToolbar blockId={block.id} content={block.content} />
                                <textarea 
                                    value={block.content}
                                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                    className="w-full h-full min-h-[120px] bg-transparent outline-none text-lg font-serif text-stone-700 resize-y leading-relaxed placeholder-stone-300 focus:bg-stone-50/30 rounded-md p-2 transition-colors"
                                    placeholder="Skriv noe vakkert..."
                                />
                            </div>
                        )}

                        {/* Header Block */}
                        {block.type === BlockType.HEADER && (
                            <div className="py-2 border-l-4 border-stone-900 pl-4">
                                <input 
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                className="w-full bg-transparent outline-none text-3xl font-serif font-bold text-stone-800 border-b border-transparent focus:border-stone-200 pb-2 transition-colors placeholder-stone-300"
                                placeholder="Ny Akt Tittel"
                                />
                                <input 
                                value={block.metadata?.description || ''}
                                onChange={(e) => updateBlockMetadata(block.id, 'description', e.target.value)}
                                className="w-full bg-transparent outline-none text-stone-400 italic mt-2 text-sm"
                                placeholder="Seksjonstema eller beskrivelse..."
                                />

                                {/* Background Image Settings */}
                                <div className="mt-4 flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Bakgrunnsbilde:</span>
                                    {block.metadata?.backgroundImage ? (
                                        <div className="flex items-center gap-2 bg-stone-100 px-2 py-1 rounded-md border border-stone-200">
                                            <img src={block.metadata.backgroundImage} className="w-6 h-6 rounded object-cover" alt="preview"/>
                                            <span className="text-xs text-stone-500 truncate max-w-[100px]">Bilde valgt</span>
                                            <button onClick={() => updateBlockMetadata(block.id, 'backgroundImage', undefined)} className="text-stone-400 hover:text-red-500">
                                                <X className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                             <button onClick={() => handleHeaderBgUploadClick(block.id)} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded" title="Last opp">
                                                <Upload className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleHeaderBackgroundUnsplash(block.id)} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded" title="Søk Unsplash">
                                                <Search className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleHeaderBackgroundUrl(block.id)} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded" title="URL">
                                                <LinkIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tabs Block (Visual Editor) */}
                        {block.type === BlockType.TABS && (
                            <div className="space-y-4">
                                <div className="flex items-center text-stone-400 uppercase text-xs tracking-widest mb-4">
                                    <LayoutTemplate className="w-4 h-4 mr-2"/> Interaktiv Steg-Modell
                                </div>
                                {(() => {
                                    let tabs: TabItem[] = [];
                                    try { tabs = JSON.parse(block.content); } catch(e) { tabs = [] }
                                    const activeIndex = activeTabEdits[block.id] || 0;
                                    
                                    // Helper to update a specific tab
                                    const updateTab = (tIdx: number, field: keyof TabItem, val: string) => {
                                        const newTabs = [...tabs];
                                        newTabs[tIdx] = { ...newTabs[tIdx], [field]: val };
                                        updateBlockContent(block.id, JSON.stringify(newTabs));
                                    };

                                    // Helper for Tab DnD
                                    const handleTabDragStart = (tIdx: number) => setDraggedTabIndex(tIdx);
                                    const handleTabDragEnter = (tIdx: number) => {
                                        if (draggedTabIndex === null || draggedTabIndex === tIdx) return;
                                        const newTabs = [...tabs];
                                        const item = newTabs[draggedTabIndex];
                                        newTabs.splice(draggedTabIndex, 1);
                                        newTabs.splice(tIdx, 0, item);
                                        setDraggedTabIndex(tIdx);
                                        updateBlockContent(block.id, JSON.stringify(newTabs));
                                        if (activeIndex === draggedTabIndex) setActiveTabEdits(prev => ({ ...prev, [block.id]: tIdx }));
                                    };

                                    return (
                                        <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden flex flex-col md:flex-row">
                                            {/* Vertical Tab List (Left Side) */}
                                            <div className="w-full md:w-1/3 bg-stone-100/50 border-r border-stone-200 p-2 overflow-y-auto max-h-[400px]">
                                                <div className="space-y-1">
                                                    {tabs.map((tab, tIdx) => (
                                                        <div 
                                                            key={tIdx}
                                                            draggable
                                                            onDragStart={() => handleTabDragStart(tIdx)}
                                                            onDragEnter={() => handleTabDragEnter(tIdx)}
                                                            onDragEnd={() => setDraggedTabIndex(null)}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onClick={() => setActiveTabEdits(prev => ({ ...prev, [block.id]: tIdx }))}
                                                            className={`cursor-pointer px-3 py-3 rounded-lg text-sm flex items-center space-x-3 transition-all select-none group ${
                                                                activeIndex === tIdx 
                                                                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' 
                                                                : 'text-stone-500 hover:bg-white/50 hover:text-stone-700'
                                                            } ${draggedTabIndex === tIdx ? 'opacity-50' : ''}`}
                                                        >
                                                            <span className="w-6 h-6 flex items-center justify-center bg-stone-200 rounded-full text-xs font-bold text-stone-600">{tab.icon || (tIdx + 1)}</span>
                                                            <span className="font-medium truncate flex-1">{tab.label || 'Uten navn'}</span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newTabs = tabs.filter((_, i) => i !== tIdx);
                                                                    updateBlockContent(block.id, JSON.stringify(newTabs));
                                                                    setActiveTabEdits(prev => ({ ...prev, [block.id]: Math.max(0, activeIndex - 1) }));
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3"/>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => {
                                                            const newTabs = [...tabs, { label: 'Nytt Steg', content: '', icon: `${tabs.length + 1}` }];
                                                            updateBlockContent(block.id, JSON.stringify(newTabs));
                                                            setActiveTabEdits(prev => ({ ...prev, [block.id]: newTabs.length - 1 }));
                                                        }}
                                                        className="w-full px-3 py-2 rounded-lg text-stone-400 border border-dashed border-stone-300 hover:bg-white hover:text-stone-600 transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
                                                    >
                                                        <Plus className="w-3 h-3" /> Legg til steg
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Active Tab Editor (Right Side) */}
                                            <div className="w-full md:w-2/3 p-6 bg-white">
                                                {tabs[activeIndex] ? (
                                                    <>
                                                        <div className="grid grid-cols-4 gap-4 mb-4">
                                                            <div className="col-span-1">
                                                                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Ikon</label>
                                                                <input 
                                                                    value={tabs[activeIndex].icon || ''}
                                                                    onChange={(e) => updateTab(activeIndex, 'icon', e.target.value)}
                                                                    className="w-full bg-stone-50 border border-stone-200 rounded-md px-2 py-1.5 text-center outline-none focus:border-stone-400 text-sm"
                                                                    placeholder="#"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Tittel</label>
                                                                <input 
                                                                    value={tabs[activeIndex].label}
                                                                    onChange={(e) => updateTab(activeIndex, 'label', e.target.value)}
                                                                    className="w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 font-medium text-stone-800 outline-none focus:border-stone-400 text-sm"
                                                                    placeholder="f.eks. Mekanisk Filter"
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mb-4">
                                                             <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Bakgrunnsbilde (URL)</label>
                                                             <div className="flex gap-2">
                                                                <input 
                                                                    value={tabs[activeIndex].image || ''}
                                                                    onChange={(e) => updateTab(activeIndex, 'image', e.target.value)}
                                                                    className="flex-1 bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 text-xs outline-none focus:border-stone-400"
                                                                    placeholder="https://..."
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        const kw = prompt("Søk Unsplash:");
                                                                        if(kw) updateTab(activeIndex, 'image', `https://source.unsplash.com/featured/1600x900?${encodeURIComponent(kw)}`);
                                                                    }}
                                                                    className="px-2 bg-stone-100 rounded hover:bg-stone-200 text-stone-500"
                                                                >
                                                                    <Search className="w-3 h-3"/>
                                                                </button>
                                                             </div>
                                                        </div>

                                                        <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Innhold (Markdown)</label>
                                                        <div className="border border-stone-100 rounded-lg overflow-hidden">
                                                            <MarkdownToolbar blockId={`${block.id}-tab-${activeIndex}`} content={tabs[activeIndex].content} />
                                                            <textarea 
                                                                value={tabs[activeIndex].content}
                                                                onChange={(e) => updateTab(activeIndex, 'content', e.target.value)}
                                                                className="w-full min-h-[200px] bg-stone-50/30 p-4 text-stone-700 outline-none focus:bg-white transition-all resize-y text-sm leading-relaxed"
                                                                placeholder="Beskriv dette steget..."
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-stone-400 italic text-sm">
                                                        Velg eller opprett et steg til venstre.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Image Block */}
                        {block.type === BlockType.IMAGE && (
                            <div className="space-y-4">
                                {!block.content ? (
                                    <div className="h-48 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center space-y-3 text-stone-400 hover:bg-stone-50 transition-colors">
                                        <ImageIcon className="w-8 h-8 opacity-50" />
                                        <div className="flex space-x-4">
                                            <button 
                                                onClick={() => { setActiveImageBlockId(block.id); imageUploadRef.current?.click(); }}
                                                className="text-xs uppercase tracking-wider hover:text-stone-600 font-medium flex items-center"
                                            >
                                                <Upload className="w-3 h-3 mr-1"/> Last opp
                                            </button>
                                            <span className="text-stone-200">|</span>
                                            <button 
                                                onClick={() => handlePasteImageURL(block.id)}
                                                className="text-xs uppercase tracking-wider hover:text-stone-600 font-medium flex items-center"
                                            >
                                                <LinkIcon className="w-3 h-3 mr-1"/> Link
                                            </button>
                                            <span className="text-stone-200">|</span>
                                            <button 
                                                onClick={() => handleUnsplashImage(block.id)}
                                                className="text-xs uppercase tracking-wider hover:text-stone-600 font-medium flex items-center"
                                            >
                                                <Search className="w-3 h-3 mr-1"/> Unsplash
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative rounded-3xl overflow-hidden shadow-lg group/img">
                                        <div className="overflow-hidden rounded-3xl">
                                            <img 
                                                src={block.content} 
                                                alt="Block" 
                                                className="w-full h-auto transform transition-transform duration-1000 ease-out group-hover/img:scale-105" 
                                            />
                                        </div>
                                        <button 
                                            onClick={() => updateBlockContent(block.id, '')}
                                            className="absolute top-2 right-2 bg-white/80 p-2 rounded-full opacity-0 group-hover/img:opacity-100 transition backdrop-blur-sm"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500"/>
                                        </button>
                                    </div>
                                )}
                                <input 
                                    className="w-full text-center bg-transparent text-sm italic text-stone-400 outline-none"
                                    value={block.metadata?.caption || ''}
                                    onChange={(e) => updateBlockMetadata(block.id, 'caption', e.target.value)}
                                    placeholder="Legg til bildetekst..."
                                />
                            </div>
                        )}

                        {/* Video Block */}
                        {block.type === BlockType.VIDEO && (
                            <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                                <div className="flex items-center space-x-3 text-stone-500 mb-2">
                                    <Youtube className="w-5 h-5 text-red-600" />
                                    <span className="text-xs uppercase tracking-wider font-medium">Magisk Videoblokk</span>
                                    {block.metadata?.description === "Gemini is analyzing..." && <Loader2 className="w-3 h-3 animate-spin"/>}
                                </div>
                                
                                <div className="relative aspect-video bg-stone-900 rounded-lg overflow-hidden shadow-inner">
                                    {getYouTubeID(block.content) ? (
                                        <iframe 
                                            className="w-full h-full pointer-events-none opacity-90" 
                                            src={`https://www.youtube.com/embed/${getYouTubeID(block.content)}`}
                                            title="Video Preview"
                                            frameBorder="0"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-500 font-mono text-xs">
                                            Ugyldig Video URL
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-2">
                                    <input 
                                        className="w-full bg-transparent font-serif text-xl text-stone-900 outline-none placeholder-stone-300"
                                        value={block.metadata?.title || ''}
                                        onChange={(e) => updateBlockMetadata(block.id, 'title', e.target.value)}
                                        placeholder="Videotittel (Autogenerert)"
                                    />
                                    <input 
                                        className="w-full bg-transparent text-sm text-stone-500 outline-none placeholder-stone-300 font-light"
                                        value={block.metadata?.description || ''}
                                        onChange={(e) => updateBlockMetadata(block.id, 'description', e.target.value)}
                                        placeholder="Videobeskrivelse (Autogenerert)"
                                    />
                                </div>
                            </div>
                        )}
                      </div>
                  </div>
              ))}
          </div>

          {/* Magic Add Bar */}
          <div className="mt-16 py-12 border-t border-stone-100 flex justify-center">
             <div className="flex items-center space-x-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-full px-10 py-5 border border-stone-100">
                 <button onClick={addTextBlock} className="flex flex-col items-center space-y-2 group" title="Tekst">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <Type className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={addHeaderBlock} className="flex flex-col items-center space-y-2 group" title="Ny Seksjon">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <LayoutTemplate className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>
                 
                 <button onClick={addImageBlock} className="flex flex-col items-center space-y-2 group" title="Bilde">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <ImageIcon className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>
                 
                 <button onClick={addTabsBlock} className="flex flex-col items-center space-y-2 group" title="Faner">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <Folder className="w-5 h-5" />
                     </div>
                 </button>
                 
                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={addVideoBlock} className="flex flex-col items-center space-y-2 group" title="Magisk Video">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg relative">
                        <Sparkles className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={handleVideoAnalysis} className="flex flex-col items-center space-y-2 group" title="AI Analyse">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <Video className="w-5 h-5" />
                     </div>
                 </button>
             </div>
          </div>

      </div>
    </div>
  );
};