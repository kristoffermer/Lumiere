import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Course, BlockType, CourseBlock } from '../types';
import { MessageSquare, X, Sparkles, Maximize2, Minimize2, ChevronDown, CheckSquare, Square, ArrowLeft, Circle, ArrowRight } from 'lucide-react';
import { chatWithAI } from '../services/gemini';

interface CourseViewProps {
  course: Course;
  onBack: () => void;
}

interface CourseSection {
    id: string;
    header?: CourseBlock;
    blocks: CourseBlock[];
    styleIndex: number;
}

// Definerer atmosfæriske temaer for seksjoner med tydelige fargeoverganger
const SECTION_STYLES = [
    { 
        name: 'Paper',
        bg: 'bg-[#FDFCF8]',
        text: 'text-stone-900',
        hex: '#FDFCF8' 
    },
    { 
        name: 'Soft Sage',
        bg: 'bg-[#E3F0EA]', 
        text: 'text-stone-800',
        hex: '#E3F0EA'
    },
    { 
        name: 'Warm Sand',
        bg: 'bg-[#FAEBD7]',
        text: 'text-stone-900',
        hex: '#FAEBD7'
    },
    { 
        name: 'Mist Blue',
        bg: 'bg-[#E0EEFF]', 
        text: 'text-stone-800',
        hex: '#E0EEFF'
    },
    { 
        name: 'Rose Quartz',
        bg: 'bg-[#FFE4E8]', 
        text: 'text-stone-900',
        hex: '#FFE4E8'
    },
    {
        name: 'Velvet Grey',
        bg: 'bg-[#E5E5E5]', 
        text: 'text-stone-800',
        hex: '#E5E5E5'
    }
];

const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const MarkdownText: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
    const parseFormatting = (text: string) => {
        const regex = /(\[.*?\]\(.*?\)|`[^`]+`|\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g;
        const parts = text.split(regex);

        return parts.map((part, i) => {
            if (part.match(/^\[(.*?)\]\((.*?)\)$/)) {
                const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                if (match) {
                    return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-4 hover:opacity-70 transition-opacity">{match[1]}</a>;
                }
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="bg-white/20 px-1.5 py-0.5 rounded text-sm font-mono border border-white/10 mx-0.5">{part.slice(1, -1)}</code>;
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="italic opacity-90">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('~~') && part.endsWith('~~')) {
                return <span key={i} className="line-through opacity-60">{part.slice(2, -2)}</span>;
            }
            return part;
        });
    };

    const renderTable = (block: string, idx: number) => {
        const rows = block.trim().split('\n');
        if (rows.length < 2) return null;

        const headers = rows[0].split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
        let startIndex = 1;
        if (rows[1].includes('---')) {
            startIndex = 2;
        }

        const dataRows = rows.slice(startIndex).map(row => 
            row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
        );

        return (
            <div key={idx} className="overflow-x-auto my-8 rounded-xl border border-white/20 shadow-sm bg-white/10 backdrop-blur-sm">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                        <tr>
                            {headers.map((header, hIdx) => (
                                <th key={hIdx} className="px-6 py-3 text-left text-xs font-serif font-bold uppercase tracking-wider opacity-80">
                                    {parseFormatting(header)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {dataRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm">
                                        {parseFormatting(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderBlock = (block: string, idx: number) => {
        const trimmed = block.trim();
        
        if (trimmed.startsWith('```')) {
            const content = trimmed.replace(/^```.*\n/, '').replace(/\n```$/, '');
            return (
                <div key={idx} className="relative group w-full">
                    <div className="absolute -top-3 left-4 bg-black/50 backdrop-blur text-white text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold border border-white/10">
                        Kode
                    </div>
                    <pre className="bg-black/40 text-stone-200 p-6 rounded-xl overflow-x-auto text-sm font-mono my-8 shadow-inner border border-white/10">
                        <code>{content}</code>
                    </pre>
                </div>
            );
        }

        if (trimmed.startsWith('|')) {
            return renderTable(trimmed, idx);
        }

        return (
            <div key={idx} className="w-full">
                {block.split('\n').map((line, lIdx) => {
                    if (line.startsWith('# ')) return <h1 key={lIdx} className="font-serif text-4xl mt-8 mb-4 leading-tight border-b border-white/20 pb-4">{parseFormatting(line.replace('# ', ''))}</h1>;
                    if (line.startsWith('## ')) return <h2 key={lIdx} className="font-serif text-3xl mt-8 mb-4 font-medium">{parseFormatting(line.replace('## ', ''))}</h2>;
                    if (line.startsWith('### ')) return <h3 key={lIdx} className="font-serif text-xl mt-6 mb-3 font-bold uppercase tracking-wide opacity-90">{parseFormatting(line.replace('### ', ''))}</h3>;

                    if (line.startsWith('> ')) return (
                        <div key={lIdx} className="border-l-4 border-white/40 pl-6 py-3 my-8 italic text-xl font-serif bg-white/5 rounded-r-xl">
                            {parseFormatting(line.replace('> ', ''))}
                        </div>
                    );

                    if (line.startsWith('- [ ] ')) return <div key={lIdx} className="flex items-center space-x-3 my-3 font-medium"><Square className="w-5 h-5 opacity-60" /><span>{parseFormatting(line.replace('- [ ] ', ''))}</span></div>;
                    if (line.startsWith('- [x] ')) return <div key={lIdx} className="flex items-center space-x-3 my-3 opacity-60 line-through"><CheckSquare className="w-5 h-5" /><span>{parseFormatting(line.replace('- [x] ', ''))}</span></div>;
                    if (line.startsWith('- ')) return <li key={lIdx} className="ml-4 list-disc pl-2 mb-2 leading-relaxed">{parseFormatting(line.replace('- ', ''))}</li>;
                    if (line.match(/^\d+\. /)) return <li key={lIdx} className="ml-4 list-decimal pl-2 mb-2 leading-relaxed">{parseFormatting(line.replace(/^\d+\. /, ''))}</li>;

                    if (line.trim() === '---') return <div key={lIdx} className="flex items-center justify-center my-10 opacity-30"><span className="w-2 h-2 bg-current rounded-full mx-1"></span><span className="w-2 h-2 bg-current rounded-full mx-1"></span><span className="w-2 h-2 bg-current rounded-full mx-1"></span></div>;

                    if (line.trim() === '') return <br key={lIdx}/>;

                    return <p key={lIdx} className="mb-4 leading-relaxed text-lg">{parseFormatting(line)}</p>;
                })}
            </div>
        );
    }

    const blocks = content.split(/\n\n+/);
    return <div className={className}>{blocks.map((b, i) => renderBlock(b, i))}</div>;
};

const TabBlock: React.FC<{ content: string }> = ({ content }) => {
    const [activeTab, setActiveTab] = useState(0);
    let tabs = [];
    try {
        tabs = JSON.parse(content);
    } catch (e) {
        tabs = [];
    }

    if (!tabs.length) return null;

    const activeItem = tabs[activeTab];
    const isLight = activeItem.variant === 'light';

    return (
        <div className="my-16 max-w-7xl mx-auto w-full px-2 md:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                
                {/* Left Side: Interactive Menu (Stepper) */}
                <div className="lg:col-span-4 flex flex-col relative">
                    {/* Stepper Line (Desktop Only) */}
                    <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-stone-200 -z-10 hidden lg:block"></div>
                    
                    <div className="space-y-3">
                        {tabs.map((tab: any, idx: number) => {
                             const isActive = activeTab === idx;
                             return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveTab(idx)}
                                    className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 text-left w-full ${
                                        isActive 
                                        ? 'bg-white shadow-lg scale-[1.02] z-10 ring-1 ring-black/5' 
                                        : 'hover:bg-white/60'
                                    }`}
                                >
                                    {/* Icon Bubble */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0 transition-all duration-300 border-2 ${
                                        isActive 
                                        ? 'bg-stone-900 text-white border-stone-900' 
                                        : 'bg-white text-stone-400 border-stone-200 group-hover:border-stone-300'
                                    }`}>
                                        {tab.icon || (idx + 1)}
                                    </div>

                                    {/* Label Content */}
                                    <div className="ml-5 flex-1">
                                        {/* Subtitle - No longer hardcoded */}
                                        {tab.subtitle && (
                                            <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 transition-colors ${isActive ? 'text-stone-500' : 'text-stone-400'}`}>
                                                {tab.subtitle}
                                            </div>
                                        )}
                                        <div className={`font-serif text-lg leading-tight transition-colors ${isActive ? 'text-stone-900 font-bold' : 'text-stone-600 font-medium'}`}>
                                            {tab.label}
                                        </div>
                                    </div>

                                    {/* Active Indicator Arrow */}
                                    {isActive && (
                                        <ArrowRight className="w-5 h-5 text-stone-900 mr-2 animate-pulse hidden lg:block" />
                                    )}
                                </button>
                             );
                        })}
                    </div>
                </div>

                {/* Right Side: Cinematic Content Card */}
                <div className="lg:col-span-8">
                    <div className={`relative rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex flex-col transition-all duration-500 ${isLight ? 'bg-white ring-1 ring-stone-200' : 'bg-stone-900'}`}>
                        
                        {/* Dynamic Background */}
                        <div className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out">
                            {activeItem.image ? (
                                <>
                                    <img 
                                        key={activeItem.image} // Force re-render for fade effect
                                        src={activeItem.image} 
                                        className="w-full h-full object-cover animate-fade-in-up opacity-90 scale-105"
                                        style={{ animationDuration: '1.5s' }}
                                        alt="Bakgrunn"
                                    />
                                    {/* Gradient overlay for text readability - varies by theme */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${isLight ? 'from-white/95 via-white/70 to-white/40' : 'from-stone-900/90 via-stone-900/60 to-transparent'} md:via-opacity-40`}></div>
                                    <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-white via-white/50 to-transparent' : 'from-stone-900 via-transparent to-transparent'} opacity-80`}></div>
                                </>
                            ) : (
                                /* Fallback Abstract Background */
                                <div className={`w-full h-full bg-gradient-to-br ${isLight ? 'from-stone-100 to-white' : 'from-stone-800 to-black'}`}>
                                    <div className={`absolute -right-20 -top-20 w-96 h-96 rounded-full blur-[100px] ${isLight ? 'bg-blue-200/20' : 'bg-blue-500/10'}`}></div>
                                    <div className={`absolute -left-20 -bottom-20 w-96 h-96 rounded-full blur-[100px] ${isLight ? 'bg-purple-200/20' : 'bg-purple-500/10'}`}></div>
                                </div>
                            )}
                        </div>

                        {/* Content Layer */}
                        <div className="relative z-10 p-8 md:p-12 flex flex-col h-full justify-center">
                             <div key={activeTab} className="animate-fade-in-up">
                                <div className={`inline-flex items-center space-x-2 mb-6 px-3 py-1 rounded-full border backdrop-blur-md w-fit ${isLight ? 'bg-stone-900/5 border-stone-900/10' : 'bg-white/10 border-white/10'}`}>
                                    <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? 'bg-stone-900' : 'bg-white'}`}></span>
                                    <span className={`text-xs font-bold tracking-widest uppercase ${isLight ? 'text-stone-900' : 'text-white'}`}>
                                        {activeItem.label}
                                    </span>
                                </div>

                                <div className={`prose prose-lg max-w-none leading-relaxed font-light ${isLight ? 'prose-stone text-stone-800' : 'prose-invert text-stone-100'}`}>
                                    <MarkdownText content={activeItem.content} />
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AIChatOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await chatWithAI(messages, userMsg.text);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-stone-900 text-white p-4 rounded-full shadow-2xl hover:bg-stone-800 transition-all z-40 group"
        title="Spør Lumière"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-stone-100 transform transition-transform duration-300 ease-out">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 backdrop-blur">
            <div>
              <h3 className="font-serif text-xl text-stone-900">Lumière Assistent</h3>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Drevet av Gemini 3 Pro</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-900">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/30">
            {messages.length === 0 && (
              <div className="text-center text-stone-400 mt-10">
                <p className="font-serif italic">"Spør meg om hva som helst i kurset..."</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-stone-900 text-white' 
                    : 'bg-white border border-stone-100 text-stone-800 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-100 p-4 rounded-2xl shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-stone-100">
            <div className="flex items-center bg-stone-50 rounded-xl px-4 py-2 border border-stone-200 focus-within:border-stone-400 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Skriv spørsmålet ditt..."
                className="flex-1 bg-transparent outline-none text-stone-800 placeholder-stone-400 text-sm"
              />
              <button onClick={handleSend} disabled={loading} className="ml-2 text-stone-400 hover:text-stone-900">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const CourseView: React.FC<CourseViewProps> = ({ course, onBack }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [cinematicVideoId, setCinematicVideoId] = useState<string | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  
  // Ref array handles: [0: Hero, 1..N: Sections, N+1: End]
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const sections = useMemo(() => {
    const result: CourseSection[] = [];
    let currentSection: CourseSection = { 
        id: 'intro', 
        blocks: [], 
        styleIndex: 0 
    };

    course.blocks.forEach((block) => {
        if (block.type === BlockType.HEADER) {
            if (currentSection.blocks.length > 0 || currentSection.header) {
                result.push(currentSection);
            }
            currentSection = {
                id: block.id,
                header: block,
                blocks: [],
                styleIndex: result.length + 1
            };
        } else {
            currentSection.blocks.push(block);
        }
    });
    result.push(currentSection);
    return result;
  }, [course.blocks]);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainScrollRef.current) return;
      const container = mainScrollRef.current;
      const totalScroll = container.scrollTop;
      const windowHeight = container.scrollHeight - container.clientHeight;
      setScrollProgress(totalScroll / windowHeight);

      // Better intersection detection for sections in a scroll container
      // Note: Indexes are now 0 (Hero), 1..N (Sections), N+1 (End)
      sectionRefs.current.forEach((ref, index) => {
          if (ref) {
              const rect = ref.getBoundingClientRect();
              // Check if section is mostly visible in viewport
              if (rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5) {
                  setActiveSectionIndex(index);
              }
          }
      });
    };
    
    const container = mainScrollRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll);
        // Trigger once to set initial state
        handleScroll();
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = useCallback((index: number) => {
      const maxIndex = sections.length + 1; // 0=Hero, 1..N=Sections, N+1=End
      const targetIndex = Math.max(0, Math.min(index, maxIndex));
      
      sectionRefs.current[targetIndex]?.scrollIntoView({ behavior: 'smooth' });
  }, [sections.length]);

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Check if we are in an input field (e.g. Chat)
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            scrollToSection(activeSectionIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            scrollToSection(activeSectionIndex - 1);
        } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToSection(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            scrollToSection(sections.length + 1);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSectionIndex, scrollToSection, sections.length]);

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderBlock = (block: CourseBlock) => {
    switch (block.type) {
      case BlockType.TEXT:
        // Render standard markdown text unless it's just plain text in a section that might have a specific theme
        // For now, we keep it consistent.
        return (
          <div className="prose prose-lg prose-stone mx-auto font-light text-stone-700 leading-loose mb-12 max-w-3xl relative z-10">
            <MarkdownText content={block.content} className="" />
          </div>
        );
      case BlockType.TABS:
        return <div className="relative z-10"><TabBlock content={block.content} /></div>;
      case BlockType.VIDEO:
        const videoId = getYouTubeID(block.content);
        return (
          <div className="my-16 group relative w-full max-w-5xl mx-auto z-10">
             <div className="relative aspect-video bg-stone-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out group-hover:scale-[1.01] group-hover:shadow-3xl">
                {videoId ? (
                    <>
                        <iframe 
                            className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        ></iframe>
                        
                        <button 
                            onClick={() => setCinematicVideoId(videoId)}
                            className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 shadow-xl border border-white/20"
                            title="Kino Modus"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-500">Video Plassholder</div>
                )}
             </div>
             <div className="mt-6 max-w-2xl mx-auto text-center">
                 <h3 className="font-serif text-2xl text-stone-900 mb-2">{block.metadata?.title}</h3>
                 {block.metadata?.description && <p className="text-stone-500 text-sm font-light">{block.metadata.description}</p>}
             </div>
          </div>
        );
      case BlockType.IMAGE:
        return (
           <div className="my-20 group perspective w-full max-w-5xl mx-auto z-10 relative">
               <div className="relative transform transition-transform duration-700 ease-out group-hover:scale-[1.01]">
                    <img 
                        src={block.content} 
                        alt="Course visual" 
                        className="w-full h-auto shadow-xl rounded-3xl" 
                    />
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/10"></div>
               </div>
               {block.metadata?.caption && <p className="mt-6 text-center text-stone-400 italic text-sm font-serif">{block.metadata.caption}</p>}
           </div>
        );
      default:
        return null;
    }
  };

  // Determine active theme based on section. 
  // Index 0 = Hero (use default). 
  // Index 1..N = Section k (use k-1).
  const effectiveSection = activeSectionIndex === 0 ? null : sections[activeSectionIndex - 1];
  const activeTheme = effectiveSection 
    ? (SECTION_STYLES[effectiveSection.styleIndex % SECTION_STYLES.length] || SECTION_STYLES[0])
    : SECTION_STYLES[0];

  const activeBackgroundImage = effectiveSection?.header?.metadata?.backgroundImage;

  return (
    <div className={`h-screen w-screen overflow-hidden relative transition-colors duration-[1200ms] ease-in-out ${activeTheme.bg} ${activeTheme.text}`}>
      
      {/* Fixed Background Layer for Transitions with Parallax Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Render background image if present for active section */}
          <div 
            className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${activeBackgroundImage ? 'opacity-40' : 'opacity-0'}`}
          >
             {activeBackgroundImage && (
                 <img 
                    src={activeBackgroundImage} 
                    className="w-full h-full object-cover filter blur-[2px] transition-transform duration-[2000ms] ease-out"
                    style={{ 
                        // Gentle parallax/pan effect based on active section index
                        transform: `scale(1.05) translateY(${activeSectionIndex * 2}%)` 
                    }}
                    alt="Atmosphere"
                 />
             )}
          </div>
          {/* Overlay Gradients to ensure text readability regardless of image */}
          <div className={`absolute inset-0 bg-gradient-to-b from-${activeTheme.bg}/90 via-${activeTheme.bg}/60 to-${activeTheme.bg} transition-colors duration-[1500ms]`}></div>
      </div>

      {/* Global Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
         <div className={`absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply filter blur-[100px] animate-pulse transition-colors duration-[2000ms] bg-stone-200/50`}></div>
         <div className={`absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[120px] animate-pulse transition-colors duration-[2000ms] bg-white/60`}></div>
      </div>

      {/* Cinematic Mode Video Overlay */}
      {cinematicVideoId && (
          <div className="fixed inset-0 z-[100] bg-black animate-fade-in-up duration-500 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
                  <div>
                      <h3 className="text-white/80 font-serif text-xl tracking-wide">Kino Modus</h3>
                  </div>
                  <button 
                    onClick={() => setCinematicVideoId(null)} 
                    className="group flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
                  >
                      <span className="text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Avslutt</span>
                      <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                        <Minimize2 className="w-6 h-6" />
                      </div>
                  </button>
              </div>

              <div className="w-full h-full max-w-[90vw] max-h-[90vh] aspect-video shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                 <iframe 
                    className="w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${cinematicVideoId}?autoplay=1&modestbranding=1&rel=0`}
                    title="Cinematic Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
              </div>
          </div>
      )}

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-stone-900/5 z-50">
        <div 
            className="h-full bg-stone-900 transition-all duration-200 ease-out"
            style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Chapter Nav */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden lg:flex flex-col items-end space-y-4">
          {/* Start Dot */}
          <div className="group flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection(0)}>
               <span className={`text-xs font-medium uppercase tracking-widest transition-all duration-300 ${activeSectionIndex === 0 ? 'text-stone-900 opacity-100 translate-x-0' : 'text-stone-400 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                   Start
               </span>
               <div className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSectionIndex === 0 ? 'bg-stone-900 scale-125' : 'bg-stone-300 group-hover:bg-stone-400'}`} />
          </div>

          {/* Section Dots */}
          {sections.map((section, idx) => (
              <div key={section.id} className="group flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection(idx + 1)}>
                   <span className={`text-xs font-medium uppercase tracking-widest transition-all duration-300 ${activeSectionIndex === idx + 1 ? 'text-stone-900 opacity-100 translate-x-0' : 'text-stone-400 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                       {section.header ? section.header.content.replace('Act ', 'Akt ') : 'Intro'}
                   </span>
                   <div className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSectionIndex === idx + 1 ? 'bg-stone-900 scale-125' : 'bg-stone-300 group-hover:bg-stone-400'}`} />
              </div>
          ))}
      </div>

      {/* Main Content Stream - Scroll Container */}
      <main 
        ref={mainScrollRef}
        className="h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth relative z-10 focus:outline-none"
        tabIndex={0} // Make div focusable for keyboard events just in case, though window listener handles it
      >
          
        {/* Hero Section - Index 0 */}
        <header 
            ref={(el) => { sectionRefs.current[0] = el }} 
            className="snap-start min-h-screen relative flex items-center justify-center overflow-hidden"
        >
            {course.coverImage ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 grayscale-[10%]"
                    style={{ backgroundImage: `url(${course.coverImage})` }}
                />
            ) : (
                <div className="absolute inset-0 bg-stone-200 z-0" />
            )}
            <div className="absolute inset-0 bg-black/30 z-10 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent z-10" />
            
            <div className="relative z-20 text-center px-6 max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-block mb-6 px-3 py-1 border border-white/30 text-white/90 text-xs tracking-[0.3em] uppercase rounded-full backdrop-blur-md shadow-lg">
                {course.category || 'Originalt Kurs'}
            </div>
            <h1 className="font-serif text-6xl md:text-8xl text-white mb-8 leading-[0.9] drop-shadow-2xl">{course.title}</h1>
            <p className="text-xl text-white/90 font-light leading-relaxed max-w-2xl mx-auto drop-shadow-md">{course.description}</p>
            
            <div className="mt-12 animate-bounce cursor-pointer" onClick={() => scrollToSection(1)}>
                <ChevronDown className="w-8 h-8 text-white/50 mx-auto hover:text-white transition-colors" />
            </div>
            </div>

            <button onClick={onBack} className="absolute top-8 left-8 text-white/80 hover:text-white z-30 flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full backdrop-blur hover:bg-black/40 transition-all">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Tilbake</span>
            </button>
        </header>

        {/* Content Sections - Index 1..N */}
        {sections.map((section, index) => (
            <section 
                key={section.id} 
                ref={(el) => { sectionRefs.current[index + 1] = el }}
                className="snap-start min-h-screen relative py-24 md:py-32 px-6 flex flex-col justify-center items-center"
            >
                {/* Content Wrapper */}
                <div className={`relative z-10 w-full max-w-7xl mx-auto transition-all duration-1000 ${
                    section.header?.metadata?.backgroundImage 
                        ? 'bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl p-8 md:p-16 border border-white/40 my-12' 
                        : ''
                }`}>
                    {/* Section Header */}
                    {section.header && (
                         <ScrollReveal>
                            <div className="text-center mb-20">
                                <div className="inline-block w-12 h-1 bg-stone-900 mb-8 opacity-20"></div>
                                <h2 className="font-serif text-4xl md:text-6xl text-stone-900 mb-6 leading-tight drop-shadow-sm">{section.header.content}</h2>
                                {section.header.metadata?.description && (
                                <p className="text-lg text-stone-600 max-w-xl mx-auto font-light italic font-serif">
                                    "{section.header.metadata.description}"
                                </p>
                                )}
                            </div>
                        </ScrollReveal>
                    )}

                    {/* Section Blocks */}
                    <div className="space-y-8 w-full">
                        {section.blocks.map((block, bIdx) => (
                            <ScrollReveal key={block.id} delay={bIdx * 100}>
                                {renderBlock(block)}
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>
        ))}

        {/* End Section - Index N+1 */}
        <div 
            ref={(el) => { sectionRefs.current[sections.length + 1] = el }}
            className="snap-start h-[50vh] flex flex-col items-center justify-center text-center relative z-10 bg-white/50 backdrop-blur-sm"
        >
            <h3 className="font-serif text-3xl text-stone-900 mb-4">Slutt.</h3>
            <button onClick={onBack} className="text-stone-500 hover:text-stone-900 underline decoration-1 underline-offset-8 transition-all">Tilbake til biblioteket</button>
        </div>
      </main>

      <AIChatOverlay />
    </div>
  );
};