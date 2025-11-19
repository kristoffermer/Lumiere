import React, { useState } from 'react';
import { Course, ViewMode, BlockType } from './types';
import { CourseView } from './components/CourseView';
import { CreatorStudio } from './components/CreatorStudio';
import { Play, PenTool, Library, Plus, Edit2 } from 'lucide-react';

// Sample course for demo
const SAMPLE_COURSE: Course = {
  id: 'demo-1',
  title: 'The Art of Coffee',
  description: 'A cinematic journey into the history, science, and craft of brewing the perfect cup. Discover the origins of the bean and the mastery of the pour.',
  coverImage: 'https://images.unsplash.com/photo-1447933601403-0c60889eeaf6?q=80&w=2070&auto=format&fit=crop',
  blocks: [
    {
        id: '1',
        type: BlockType.HEADER,
        content: 'Act I: The Origin',
        metadata: { description: 'Before the cup, there was the bean.' }
    },
    {
        id: '2',
        type: BlockType.TEXT,
        content: 'Coffee is not merely a drink. It is a ritual, a moment of pause in a chaotic world. To understand coffee is to understand a history that spans centuries and continents, from the highlands of Ethiopia to the bustling cafes of Paris.'
    },
    {
        id: '3',
        type: BlockType.VIDEO,
        content: 'https://www.youtube.com/watch?v=An6LvWQuj_8',
        metadata: {
            title: 'Understanding Extraction',
            description: 'Why your coffee tastes the way it does. A deep dive into the chemistry of flavor.'
        }
    },
    {
        id: '4',
        type: BlockType.HEADER,
        content: 'Act II: The Chemistry',
        metadata: { description: 'Temperature, pressure, and the dance of molecules.' }
    },
    {
        id: '5',
        type: BlockType.TEXT,
        content: 'When water meets ground coffee, a complex chemical reaction begins. Temperature, pressure, and time dance together to extract soluble compounds. Too little, and it is sour. Too much, and it is bitter.'
    }
  ]
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LANDING);
  const [activeCourse, setActiveCourse] = useState<Course | undefined>(undefined);
  const [courses, setCourses] = useState<Course[]>([SAMPLE_COURSE]);

  const handleSaveCourse = (savedCourse: Course) => {
      setCourses(prev => {
          const exists = prev.find(c => c.id === savedCourse.id);
          if (exists) {
              return prev.map(c => c.id === savedCourse.id ? savedCourse : c);
          }
          return [...prev, savedCourse];
      });
      setActiveCourse(savedCourse);
      setViewMode(ViewMode.STUDENT);
  };

  const openCourse = (course: Course) => {
      setActiveCourse(course);
      setViewMode(ViewMode.STUDENT);
  };

  const editCourse = (e: React.MouseEvent, course: Course) => {
      e.stopPropagation();
      setActiveCourse(course);
      setViewMode(ViewMode.CREATOR);
  };

  const createNewCourse = () => {
      setActiveCourse(undefined);
      setViewMode(ViewMode.CREATOR);
  };

  if (viewMode === ViewMode.STUDENT && activeCourse) {
    return <CourseView course={activeCourse} onBack={() => setViewMode(ViewMode.LANDING)} />;
  }

  if (viewMode === ViewMode.CREATOR) {
    return <CreatorStudio initialCourse={activeCourse} onSave={handleSaveCourse} onCancel={() => setViewMode(ViewMode.LANDING)} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-900 flex flex-col font-sans">
      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto w-full z-50">
          <div className="font-serif text-2xl font-bold tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => setViewMode(ViewMode.LANDING)}>
              <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white text-sm font-serif italic">L</div>
              Lumière
          </div>
          <div className="space-x-6 text-sm font-medium text-stone-500">
              <button className="hover:text-stone-900 transition">Library</button>
              <button 
                onClick={createNewCourse}
                className="hover:text-stone-900 transition bg-stone-100 px-4 py-2 rounded-full"
              >
                Create
              </button>
          </div>
      </nav>

      {/* Hero Section */}
      <header className="px-6 text-center max-w-4xl mx-auto mt-12 mb-24">
          <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-stone-100 text-stone-500 text-xs font-bold tracking-[0.2em] uppercase">
              Redefining EdTech
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-stone-900 mb-8 leading-[1.1]">
            Learn like you're <br/> <span className="italic text-stone-500">watching a film.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              Create and experience courses with cinematic fidelity. No code, no friction. Just pure, organic flow.
          </p>
          
          <button 
            onClick={createNewCourse}
            className="flex items-center space-x-3 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl mx-auto"
          >
              <PenTool className="w-5 h-5" />
              <span className="font-medium">Create New Course</span>
          </button>
      </header>

      {/* Course Grid / Overview */}
      <section className="max-w-7xl mx-auto w-full px-6 pb-24">
          <div className="flex items-center justify-between mb-12 border-b border-stone-200 pb-4">
             <h2 className="font-serif text-3xl text-stone-800">Available Courses</h2>
             <span className="text-stone-400 text-sm">{courses.length} Stories</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {courses.map((course) => (
                  <div 
                    key={course.id} 
                    onClick={() => openCourse(course)}
                    className="group cursor-pointer flex flex-col relative"
                  >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-500 bg-stone-100">
                          {course.coverImage ? (
                              <img 
                                src={course.coverImage} 
                                alt={course.title} 
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out grayscale-[20%] group-hover:grayscale-0"
                              />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-stone-200 text-stone-400">
                                  <Library className="w-12 h-12 opacity-20" />
                              </div>
                          )}
                          
                          {/* Hover Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10">
                              <div className="w-16 h-16 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                  <Play className="w-6 h-6 ml-1 text-stone-900 fill-stone-900" />
                              </div>
                          </div>

                          {/* Edit Button on Card */}
                          <button 
                            onClick={(e) => editCourse(e, course)}
                            className="absolute top-4 right-4 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                            title="Edit Course"
                          >
                              <Edit2 className="w-4 h-4 text-stone-600"/>
                          </button>
                      </div>
                      
                      <div className="px-2">
                          <div className="flex items-center space-x-2 mb-3">
                             <span className="h-px w-8 bg-stone-300"></span>
                             <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">Course</span>
                          </div>
                          <h3 className="font-serif text-2xl text-stone-900 leading-tight mb-3 group-hover:text-stone-600 transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-stone-500 font-light text-sm line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                      </div>
                  </div>
              ))}

              {/* New Course Card */}
              <button 
                onClick={createNewCourse}
                className="group flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all duration-300"
              >
                  <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-white flex items-center justify-center text-stone-400 group-hover:text-stone-900 transition-colors mb-4">
                      <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-serif text-lg text-stone-400 group-hover:text-stone-900">Create New Story</span>
              </button>
          </div>
      </section>

      <footer className="p-8 text-center text-stone-400 text-sm border-t border-stone-100 bg-white">
          &copy; 2024 Lumière Learning Platform. Powered by Google Gemini.
      </footer>
    </div>
  );
}

export default App;