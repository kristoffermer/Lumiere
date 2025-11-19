import React, { useState, useRef, useEffect } from 'react';
import { Course, CourseBlock, BlockType } from '../types';
import { Plus, Image as ImageIcon, Type, Youtube, Wand2, Video, Loader2, ChevronLeft, Sparkles, LayoutTemplate, Bold, Italic, List, Folder, Link as LinkIcon, Trash2, Upload, Search, GripVertical, Heading1, Heading2, Heading3, Quote, Code, CheckSquare, Minus, AlignLeft, MoreHorizontal } from 'lucide-react';
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
}

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ initialCourse, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
  const [activeImageBlockId, setActiveImageBlockId] = useState<string | null>(null);

  // Load initial data if editing
  useEffect(() => {
      if (initialCourse) {
          setTitle(initialCourse.title);
          setDescription(initialCourse.description);
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
      const keyword = prompt("Enter a keyword for Unsplash (e.g. 'Minimalist Coffee'):");
      if (keyword) {
          setCoverImage(`https://source.unsplash.com/featured/1600x900?${encodeURIComponent(keyword)}`);
      }
  };

  const handleCoverUrl = () => {
      const url = prompt("Paste image URL:");
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
          content: "New Act",
          metadata: { description: "Section description..." }
      }]);
  };

  const addTabsBlock = () => {
      const initialTabs: TabItem[] = [
          { label: 'Overview', content: 'Brief overview...', icon: '📋' },
          { label: 'Details', content: 'Deep dive...', icon: '🔍' }
      ];
      setBlocks([...blocks, {
          id: Date.now().toString(),
          type: BlockType.TABS,
          content: JSON.stringify(initialTabs)
      }]);
  };

  const addVideoBlock = async () => {
      const url = prompt("Paste YouTube URL to embed:", "https://www.youtube.com/watch?v=...");
      if (!url) return;

      const videoId = getYouTubeID(url);
      const initialTitle = videoId ? "Loading Metadata..." : "Video Block";
      const initialDesc = videoId ? "Gemini is analyzing..." : "Paste a valid YouTube URL";

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
      const url = prompt("Paste Image URL:");
      if (url) updateBlockContent(id, url);
  };

  const handleUnsplashImage = (id: string) => {
      const keyword = prompt("Enter a keyword for Unsplash:");
      if (keyword) {
          updateBlockContent(id, `https://source.unsplash.com/featured/1200x800?${encodeURIComponent(keyword)}`);
      }
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
        content: "Analyzing video content with Gemini 3 Pro...", 
        metadata: { title: "Video Analysis" } 
    }]);

    const analysis = await analyzeVideoContent(file, "Analyze this video. Provide a summary.");
    setBlocks(prev => prev.map(b => b.id === tempId ? { ...b, content: analysis } : b));
  };

  // Generic Updates
  const updateBlockContent = (id: string, newContent: string) => {
      setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  const updateBlockMetadata = (id: string, field: string, value: string) => {
    setBlocks(blocks.map(b => {
        if (b.id === id) {
            return { ...b, metadata: { ...b.metadata, [field]: value } };
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
      // Simple append for now, could be improved with selection awareness if we had a ref to textarea
      let insertion = '';
      switch(type) {
          case 'bold': insertion = ' **bold** '; break;
          case 'italic': insertion = ' *italic* '; break;
          case 'h1': insertion = '\n# Heading 1\n'; break;
          case 'h2': insertion = '\n## Heading 2\n'; break;
          case 'h3': insertion = '\n### Heading 3\n'; break;
          case 'list': insertion = '\n- List item'; break;
          case 'list-ol': insertion = '\n1. List item'; break;
          case 'check': insertion = '\n- [ ] Task'; break;
          case 'quote': insertion = '\n> Blockquote\n'; break;
          case 'code': insertion = '\n```\nCode block\n```\n'; break;
          case 'inline-code': insertion = ' `code` '; break;
          case 'link': insertion = ' [Link Title](url) '; break;
          case 'hr': insertion = '\n---\n'; break;
      }
      updateBlockContent(id, currentContent + insertion);
  };

  const MarkdownToolbar: React.FC<{ blockId: string, content: string }> = ({ blockId, content }) => (
      <div className="flex flex-wrap gap-1 border-b border-stone-100 pb-2 mb-2 bg-stone-50/50 p-2 rounded-lg">
          <button onClick={() => insertMarkdown(blockId, content, 'h1')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'h2')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'h3')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'bold')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Bold"><Bold className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'italic')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Italic"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'list')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Bullet List"><List className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'check')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Checklist"><CheckSquare className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-stone-300 mx-1 self-center"></div>
          <button onClick={() => insertMarkdown(blockId, content, 'quote')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Quote"><Quote className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'code')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Code Block"><Code className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'link')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Link"><LinkIcon className="w-4 h-4" /></button>
          <button onClick={() => insertMarkdown(blockId, content, 'hr')} className="p-1.5 hover:bg-stone-200 rounded text-stone-600" title="Horizontal Rule"><Minus className="w-4 h-4" /></button>
      </div>
  );

  const handlePublish = () => {
      onSave({
          id: initialCourse?.id || Date.now().toString(),
          title: title || "Untitled Course",
          description: description || "No description provided.",
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

      {/* Top Bar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-stone-200 px-6 py-4 flex justify-between items-center z-40">
          <div className="flex items-center space-x-4">
              <button onClick={onCancel} className="p-2 hover:bg-stone-100 rounded-full transition">
                  <ChevronLeft className="w-5 h-5 text-stone-500" />
              </button>
              <span className="text-xs font-bold tracking-widest uppercase text-stone-400">Creator Studio</span>
          </div>
          <button 
            onClick={handlePublish}
            className="bg-stone-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition"
          >
              {initialCourse ? 'Save Changes' : 'Publish Course'}
          </button>
      </div>

      <div className="max-w-3xl mx-auto mt-12 px-6">
          
          {/* Header / Metadata Editor */}
          <div className="group relative mb-12 space-y-6">
              <input
                type="text"
                placeholder="Enter Course Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-5xl font-serif bg-transparent outline-none placeholder-stone-300 text-stone-900"
              />
              <textarea
                placeholder="Add a poetic description..."
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
                    <span>Auto-Structure</span>
                 </button>
                 
                 <div className="h-6 w-px bg-stone-200 mx-2"></div>
                 <span className="text-xs uppercase tracking-wider text-stone-400">Cover:</span>

                 <button 
                    onClick={handleGenerateCover}
                    disabled={isGeneratingImage || !title}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition disabled:opacity-50"
                    title="Generate with AI"
                 >
                    {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                    <span>AI Gen</span>
                 </button>

                 <button 
                    onClick={() => coverUploadRef.current?.click()}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Upload File"
                 >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                 </button>

                 <button 
                    onClick={handleCoverUnsplash}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Search Unsplash"
                 >
                    <Search className="w-3 h-3" />
                    <span>Unsplash</span>
                 </button>

                 <button 
                    onClick={handleCoverUrl}
                    className="flex items-center space-x-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs uppercase tracking-wider text-stone-600 transition"
                    title="Paste URL"
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
                                    placeholder="Write something beautiful..."
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
                                placeholder="New Act Title"
                                />
                                <input 
                                value={block.metadata?.description || ''}
                                onChange={(e) => updateBlockMetadata(block.id, 'description', e.target.value)}
                                className="w-full bg-transparent outline-none text-stone-400 italic mt-2 text-sm"
                                placeholder="Section theme or description..."
                                />
                            </div>
                        )}

                        {/* Tabs Block (Visual Editor) */}
                        {block.type === BlockType.TABS && (
                            <div className="space-y-4">
                                <div className="flex items-center text-stone-400 uppercase text-xs tracking-widest mb-4">
                                    <LayoutTemplate className="w-4 h-4 mr-2"/> Interactive Tabs
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
                                        // Update block content immediately for visual feedback
                                        updateBlockContent(block.id, JSON.stringify(newTabs));
                                        // Keep active index consistent if possible, or switch to dragged
                                        if (activeIndex === draggedTabIndex) setActiveTabEdits(prev => ({ ...prev, [block.id]: tIdx }));
                                    };

                                    return (
                                        <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
                                            {/* Visual Tab Strip */}
                                            <div className="flex items-center gap-1 p-2 bg-stone-100/50 border-b border-stone-200 overflow-x-auto no-scrollbar">
                                                {tabs.map((tab, tIdx) => (
                                                    <div 
                                                        key={tIdx}
                                                        draggable
                                                        onDragStart={() => handleTabDragStart(tIdx)}
                                                        onDragEnter={() => handleTabDragEnter(tIdx)}
                                                        onDragEnd={() => setDraggedTabIndex(null)}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onClick={() => setActiveTabEdits(prev => ({ ...prev, [block.id]: tIdx }))}
                                                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all flex-shrink-0 select-none ${
                                                            activeIndex === tIdx 
                                                            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' 
                                                            : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-700'
                                                        } ${draggedTabIndex === tIdx ? 'opacity-50' : ''}`}
                                                    >
                                                        <span>{tab.icon || '📄'}</span>
                                                        <span>{tab.label || 'Untitled'}</span>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => {
                                                        const newTabs = [...tabs, { label: 'New Tab', content: '', icon: '✨' }];
                                                        updateBlockContent(block.id, JSON.stringify(newTabs));
                                                        setActiveTabEdits(prev => ({ ...prev, [block.id]: newTabs.length - 1 }));
                                                    }}
                                                    className="px-3 py-2 rounded-lg text-stone-400 hover:bg-stone-200/50 hover:text-stone-600 transition-colors flex-shrink-0"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Active Tab Editor */}
                                            {tabs[activeIndex] && (
                                                <div className="p-6 bg-white">
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="w-20">
                                                            <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Icon</label>
                                                            <input 
                                                                value={tabs[activeIndex].icon || ''}
                                                                onChange={(e) => updateTab(activeIndex, 'icon', e.target.value)}
                                                                className="w-full bg-stone-50 border border-stone-200 rounded-md px-2 py-1.5 text-center outline-none focus:border-stone-400"
                                                                placeholder="Emoji"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Tab Label</label>
                                                            <input 
                                                                value={tabs[activeIndex].label}
                                                                onChange={(e) => updateTab(activeIndex, 'label', e.target.value)}
                                                                className="w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 font-medium text-stone-800 outline-none focus:border-stone-400"
                                                                placeholder="e.g. Overview"
                                                            />
                                                        </div>
                                                        <div className="self-end">
                                                             <button 
                                                                onClick={() => {
                                                                    const newTabs = tabs.filter((_, i) => i !== activeIndex);
                                                                    updateBlockContent(block.id, JSON.stringify(newTabs));
                                                                    setActiveTabEdits(prev => ({ ...prev, [block.id]: Math.max(0, activeIndex - 1) }));
                                                                }}
                                                                className="p-2 text-stone-400 hover:text-red-500 transition-colors bg-stone-50 rounded-md border border-stone-100 hover:border-red-200"
                                                                title="Delete Tab"
                                                            >
                                                                <Trash2 className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <label className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1 block">Content</label>
                                                    <MarkdownToolbar blockId={`${block.id}-tab-${activeIndex}`} content={tabs[activeIndex].content} />
                                                    <textarea 
                                                        value={tabs[activeIndex].content}
                                                        onChange={(e) => updateTab(activeIndex, 'content', e.target.value)}
                                                        className="w-full min-h-[150px] bg-stone-50/30 border border-stone-100 rounded-lg p-4 text-stone-700 outline-none focus:bg-white focus:border-stone-300 focus:ring-2 focus:ring-stone-100 transition-all resize-y"
                                                        placeholder="Tab content goes here. Markdown supported."
                                                    />
                                                </div>
                                            )}
                                            {tabs.length === 0 && (
                                                <div className="p-8 text-center text-stone-400 text-sm italic">
                                                    No tabs yet. Click "+" to add one.
                                                </div>
                                            )}
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
                                                <Upload className="w-3 h-3 mr-1"/> Upload
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
                                    placeholder="Add a caption..."
                                />
                            </div>
                        )}

                        {/* Video Block */}
                        {block.type === BlockType.VIDEO && (
                            <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                                <div className="flex items-center space-x-3 text-stone-500 mb-2">
                                    <Youtube className="w-5 h-5 text-red-600" />
                                    <span className="text-xs uppercase tracking-wider font-medium">Magic Video Block</span>
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
                                            Invalid Video URL
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-2">
                                    <input 
                                        className="w-full bg-transparent font-serif text-xl text-stone-900 outline-none placeholder-stone-300"
                                        value={block.metadata?.title || ''}
                                        onChange={(e) => updateBlockMetadata(block.id, 'title', e.target.value)}
                                        placeholder="Video Title (Auto-generated)"
                                    />
                                    <input 
                                        className="w-full bg-transparent text-sm text-stone-500 outline-none placeholder-stone-300 font-light"
                                        value={block.metadata?.description || ''}
                                        onChange={(e) => updateBlockMetadata(block.id, 'description', e.target.value)}
                                        placeholder="Video Description (Auto-generated)"
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
                 <button onClick={addTextBlock} className="flex flex-col items-center space-y-2 group" title="Text">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <Type className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={addHeaderBlock} className="flex flex-col items-center space-y-2 group" title="New Section">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <LayoutTemplate className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>
                 
                 <button onClick={addImageBlock} className="flex flex-col items-center space-y-2 group" title="Image">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <ImageIcon className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>
                 
                 <button onClick={addTabsBlock} className="flex flex-col items-center space-y-2 group" title="Tabs">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg">
                        <Folder className="w-5 h-5" />
                     </div>
                 </button>
                 
                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={addVideoBlock} className="flex flex-col items-center space-y-2 group" title="Magic Video">
                     <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg relative">
                        <Sparkles className="w-5 h-5" />
                     </div>
                 </button>

                 <div className="w-px h-12 bg-stone-100"></div>

                 <button onClick={handleVideoAnalysis} className="flex flex-col items-center space-y-2 group" title="AI Analysis">
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