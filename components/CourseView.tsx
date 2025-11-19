import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Course, BlockType, CourseBlock } from '../types';
import { MessageSquare, X, Sparkles, Maximize2, Minimize2, ChevronDown, CheckSquare, Square, ArrowLeft } from 'lucide-react';
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
// Endret farger for å være mer distinkte ("svært tydelig") men fortsatt estetiske
const SECTION_STYLES = [
    { 
        name: 'Paper',
        bg: 'bg-[#FDFCF8]',
        text: 'text-stone-900'
    },
    { 
        name: 'Soft Sage',
        bg: 'bg-[#E3F0EA]', // Tydeligere grønn
        text: 'text-stone-800'
    },
    { 
        name: 'Warm Sand',
        bg: 'bg-[#FAEBD7]', // Antique White, tydelig varm
        text: 'text-stone-900'
    },
    { 
        name: 'Mist Blue',
        bg: 'bg-[#E0EEFF]', // Tydeligere blå
        text: 'text-stone-800'
    },
    { 
        name: 'Rose Quartz',
        bg: 'bg-[#FFE4E8]', // Tydeligere rosa
        text: 'text-stone-900'
    },
    {
        name: 'Velvet Grey',
        bg: 'bg-[#E5E5E5]', // Tydeligere grå
        text: 'text-stone-800'
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
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
    const parseFormatting = (text: string) => {
        const regex = /(\[.*?\]\(.*?\)|`[^`]+`|\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g;
        const parts = text.split(regex);

        return parts.map((part, i) => {
            if (part.match(/^\[(.*?)\]\((.*?)\)$/)) {
                const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                if (match) {
                    return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-stone-800 underline decoration-1 underline-offset-4 hover:text-blue-600 transition-colors">{match[1]}</a>;
                }
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="bg-stone-200/60 text-stone-800 px-1.5 py-0.5 rounded text-sm font-mono border border-stone-300/50 mx-0.5">{part.slice(1, -1)}</code>;
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="italic text-stone-600">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('~~') && part.endsWith('~~')) {
                return <span key={i} className="line-through text-stone-400">{part.slice(2, -2)}</span>;
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
            <div key={idx} className="overflow-x-auto my-8 rounded-xl border border-stone-200 shadow-sm bg-white/50 backdrop-blur-sm">
                <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50/80">
                        <tr>
                            {headers.map((header, hIdx) => (
                                <th key={hIdx} className="px-6 py-3 text-left text-xs font-serif font-bold text-stone-600 uppercase tracking-wider">
                                    {parseFormatting(header)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {dataRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-stone-50/50 transition-colors">
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">
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
                <div key={idx} className="relative group">
                    <div className="absolute -top-3 left-4 bg-stone-200 text-stone-600 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold">
                        Kode
                    </div>
                    <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-xl overflow-x-auto text-sm font-mono my-8 shadow-lg border border-stone-200/20">
                        <code>{content}</code>
                    </pre>
                </div>
            );
        }

        if (trimmed.startsWith('|')) {
            return renderTable(trimmed, idx);
        }

        return (
            <div key={idx}>
                {block.split('\n').map((line, lIdx) => {
                    if (line.startsWith('# ')) return <h1 key={lIdx} className="font-serif text-4xl text-stone-900 mt-8 mb-4 leading-tight border-b border-stone-200 pb-4">{parseFormatting(line.replace('# ', ''))}</h1>;
                    if (line.startsWith('## ')) return <h2 key={lIdx} className="font-serif text-3xl text-stone-800 mt-8 mb-4 font-medium">{parseFormatting(line.replace('## ', ''))}</h2>;
                    if (line.startsWith('### ')) return <h3 key={lIdx} className="font-serif text-xl text-stone-700 mt-6 mb-3 font-bold uppercase tracking-wide">{parseFormatting(line.replace('### ', ''))}</h3>;

                    if (line.startsWith('> ')) return (
                        <div key={lIdx} className="border-l-4 border-stone-400 pl-6 py-3 my-8 italic text-stone-700 text-xl font-serif bg-stone-100/50 rounded-r-xl">
                            {parseFormatting(line.replace('> ', ''))}
                        </div>
                    );

                    if (line.startsWith('- [ ] ')) return <div key={lIdx} className="flex items-center space-x-3 my-3 text-stone-700 font-medium"><Square className="w-5 h-5 text-stone-400" /><span>{parseFormatting(line.replace('- [ ] ', ''))}</span></div>;
                    if (line.startsWith('- [x] ')) return <div key={lIdx} className="flex items-center space-x-3 my-3 text-stone-400 line-through"><CheckSquare className="w-5 h-5 text-stone-400" /><span>{parseFormatting(line.replace('- [x] ', ''))}</span></div>;
                    if (line.startsWith('- ')) return <li key={lIdx} className="ml-4 list-disc pl-2 mb-2 text-stone-700 leading-relaxed">{parseFormatting(line.replace('- ', ''))}</li>;
                    if (line.match(/^\d+\. /)) return <li key={lIdx} className="ml-4 list-decimal pl-2 mb-2 text-stone-700 leading-relaxed">{parseFormatting(line.replace(/^\d+\. /, ''))}</li>;

                    if (line.trim() === '---') return <div key={lIdx} className="flex items-center justify-center my-10 opacity-30"><span className="w-2 h-2 bg-stone-900 rounded-full mx-1"></span><span className="w-2 h-2 bg-stone-900 rounded-full mx-1"></span><span className="w-2 h-2 bg-stone-900 rounded-full mx-1"></span></div>;

                    if (line.trim() === '') return <br key={lIdx}/>;

                    return <p key={lIdx} className="mb-4 leading-relaxed text-lg">{parseFormatting(line)}</p>;
                })}
            </div>
        );
    }

    const blocks = content.split(/\n\n+/);
    return <div>{blocks.map((b, i) => renderBlock(b, i))}</div>;
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

    return (
        <div className="my-12 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 overflow-hidden">
            <div className="p-2 bg-stone-50/80 m-2 rounded-2xl flex space-x-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab: any, idx: number) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx)}
                        className={`px-5 py-3 text-sm font-medium rounded-xl transition-all flex items-center space-x-2 flex-shrink-0 ${
                            activeTab === idx 
                            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5 scale-100' 
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50 scale-95'
                        }`}
                    >
                        {tab.icon && <span className="text-lg">{tab.icon}</span>}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="p-8 min-h-[200px]">
                <div className="prose prose-stone max-w-none animate-fade-in-up">
                    <MarkdownText content={tabs[activeTab].content} />
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
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(totalScroll / windowHeight);

      sectionRefs.current.forEach((ref, index) => {
          if (ref) {
              const rect = ref.getBoundingClientRect();
              if (rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.2) {
                  setActiveSectionIndex(index);
              }
          }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
      sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  };

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderBlock = (block: CourseBlock) => {
    switch (block.type) {
      case BlockType.TEXT:
        return (
          <div className="prose prose-lg prose-stone mx-auto font-light text-stone-700 leading-loose mb-12 max-w-3xl">
            <MarkdownText content={block.content} />
          </div>
        );
      case BlockType.TABS:
        return <TabBlock content={block.content} />;
      case BlockType.VIDEO:
        const videoId = getYouTubeID(block.content);
        return (
          <div className="my-16 group relative max-w-4xl mx-auto">
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
           <div className="my-20 group perspective max-w-5xl mx-auto">
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

  const activeTheme = SECTION_STYLES[sections[activeSectionIndex]?.styleIndex % SECTION_STYLES.length] || SECTION_STYLES[0];

  return (
    <div className={`min-h-screen relative transition-colors duration-[1200ms] ease-in-out ${activeTheme.bg} ${activeTheme.text}`}>
      
      {/* Global Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
         <div className={`absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply filter blur-[100px] animate-pulse transition-colors duration-[2000ms] bg-stone-200/50`}></div>
         <div className={`absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[120px] animate-pulse transition-colors duration-[2000ms] bg-white/60`}></div>
      </div>

      {/* Cinematic Mode */}
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
          {sections.map((section, idx) => (
              <div key={section.id} className="group flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection(idx)}>
                   <span className={`text-xs font-medium uppercase tracking-widest transition-all duration-300 ${activeSectionIndex === idx ? 'text-stone-900 opacity-100 translate-x-0' : 'text-stone-400 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                       {section.header ? section.header.content.replace('Act ', 'Akt ') : 'Intro'}
                   </span>
                   <div className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSectionIndex === idx ? 'bg-stone-900 scale-125' : 'bg-stone-300 group-hover:bg-stone-400'}`} />
              </div>
          ))}
      </div>

      {/* Hero */}
      <header className="relative h-[90vh] flex items-center justify-center overflow-hidden">
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
          
          <div className="mt-12 animate-bounce">
             <ChevronDown className="w-8 h-8 text-white/50 mx-auto" />
          </div>
        </div>

        <button onClick={onBack} className="absolute top-8 left-8 text-white/80 hover:text-white z-30 flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full backdrop-blur hover:bg-black/40 transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Tilbake</span>
        </button>
      </header>

      {/* Main Content Stream */}
      <main className="relative">
        {sections.map((section, index) => (
            <div 
                key={section.id} 
                ref={(el) => { sectionRefs.current[index] = el }}
                className={`relative min-h-[80vh] py-24 md:py-32 px-6 flex flex-col justify-center`}
            >
                <div className="relative z-10 max-w-4xl mx-auto w-full">
                    {/* Section Header */}
                    {section.header && (
                         <ScrollReveal>
                            <div className="text-center mb-20">
                                <div className="inline-block w-12 h-1 bg-stone-900 mb-8 opacity-20"></div>
                                <h2 className="font-serif text-4xl md:text-6xl text-stone-900 mb-6 leading-tight">{section.header.content}</h2>
                                {section.header.metadata?.description && (
                                <p className="text-lg text-stone-500 max-w-xl mx-auto font-light italic font-serif">
                                    "{section.header.metadata.description}"
                                </p>
                                )}
                            </div>
                        </ScrollReveal>
                    )}

                    {/* Section Blocks */}
                    <div className="space-y-8">
                        {section.blocks.map((block, bIdx) => (
                            <ScrollReveal key={block.id} delay={bIdx * 100}>
                                {renderBlock(block)}
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>
        ))}

        <div className="py-32 text-center relative z-10">
            <h3 className="font-serif text-3xl text-stone-900 mb-4">Slutt.</h3>
            <button onClick={onBack} className="text-stone-500 hover:text-stone-900 underline decoration-1 underline-offset-8 transition-all">Tilbake til biblioteket</button>
        </div>
      </main>

      <AIChatOverlay />
    </div>
  );
};