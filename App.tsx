
import React, { useState, useEffect } from 'react';
import { Course, ViewMode, BlockType } from './types';
import { CourseView } from './components/CourseView';
import { CreatorStudio } from './components/CreatorStudio';
import { Play, PenTool, Library, Plus, Edit2, LogIn, LogOut, Loader2, Lock, Mail, X, User as UserIcon } from 'lucide-react';

// Firebase Imports
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User 
} from 'firebase/auth';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';
import { auth, googleProvider, db } from './services/firebase';

// --- KONFIGURASJON ---

// Liste over e-poster som har lov til å logge inn og redigere
// VIKTIG: LEGG TIL DIN EGEN E-POST HER
const ALLOWED_EMAILS = [
  "din.epost@gmail.com",
  "annen.admin@example.com"
];

// Sample course for demo (Fallback if DB is empty)
const SAMPLE_COURSE: Course = {
  id: 'demo-1',
  title: 'Kunsten å brygge kaffe',
  description: 'En filmatisk reise inn i historien, vitenskapen og håndverket bak den perfekte koppen. Oppdag bønnens opprinnelse og mestringen av brygging.',
  category: 'Mat & Drikke',
  coverImage: 'https://images.unsplash.com/photo-1447933601403-0c60889eeaf6?q=80&w=2070&auto=format&fit=crop',
  blocks: [
    {
        id: '1',
        type: BlockType.HEADER,
        content: 'Akt I: Opprinnelsen',
        metadata: { 
            description: 'Før koppen fantes bønnen.',
            backgroundImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2071&auto=format&fit=crop'
        }
    },
    {
        id: '2',
        type: BlockType.TEXT,
        content: 'Kaffe er ikke bare en drikk. Det er et ritual, et øyeblikk av pause i en kaotisk verden. Å forstå kaffe er å forstå en historie som strekker seg over århundrer og kontinenter, fra høylandet i Etiopia til de travle kafeene i Paris.'
    },
    {
        id: '3',
        type: BlockType.VIDEO,
        content: 'https://www.youtube.com/watch?v=An6LvWQuj_8',
        metadata: {
            title: 'Forstå Ekstraksjon',
            description: 'Hvorfor kaffen smaker som den gjør. Et dypdykk i smakens kjemi.'
        }
    },
    {
        id: '4',
        type: BlockType.HEADER,
        content: 'Akt II: Kjemien',
        metadata: { 
            description: 'Temperatur, trykk og molekylenes dans.',
            backgroundImage: 'https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?q=80&w=2070&auto=format&fit=crop' 
        }
    },
    {
        id: '5',
        type: BlockType.TEXT,
        content: 'Når vann møter kaffe, begynner en kompleks kjemisk reaksjon. Temperatur, trykk og tid danser sammen for å trekke ut løselige forbindelser. For lite, og det blir surt. For mye, og det blir bittert.'
    }
  ]
};

const LoginModal: React.FC<{ onClose: () => void; onGoogleLogin: () => void }> = ({ onClose, onGoogleLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // For sign up only
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Create user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Update display name
                if (name) {
                    await updateProfile(userCredential.user, { displayName: name });
                }
                // Whitelist check happens in App's onAuthStateChanged
            } else {
                // Sign in
                await signInWithEmailAndPassword(auth, email, password);
            }
            onClose();
        } catch (err: any) {
            console.error("Auth error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError('Feil e-post eller passord.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('E-postadressen er allerede i bruk.');
            } else if (err.code === 'auth/weak-password') {
                setError('Passordet er for svakt (minst 6 tegn).');
            } else {
                setError('Noe gikk galt. Prøv igjen.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-serif text-2xl text-stone-900">
                            {isSignUp ? 'Opprett konto' : 'Logg inn'}
                        </h2>
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Navn</label>
                                <div className="flex items-center border border-stone-200 rounded-xl px-3 py-2 focus-within:border-stone-800 transition-colors">
                                    <UserIcon className="w-5 h-5 text-stone-400 mr-2" />
                                    <input 
                                        type="text" 
                                        required={isSignUp}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 outline-none text-stone-800 placeholder-stone-300"
                                        placeholder="Ditt Navn"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">E-post</label>
                            <div className="flex items-center border border-stone-200 rounded-xl px-3 py-2 focus-within:border-stone-800 transition-colors">
                                <Mail className="w-5 h-5 text-stone-400 mr-2" />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 outline-none text-stone-800 placeholder-stone-300"
                                    placeholder="din@epost.no"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Passord</label>
                            <div className="flex items-center border border-stone-200 rounded-xl px-3 py-2 focus-within:border-stone-800 transition-colors">
                                <Lock className="w-5 h-5 text-stone-400 mr-2" />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex-1 outline-none text-stone-800 placeholder-stone-300"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors shadow-lg flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Registrer' : 'Logg inn')}
                        </button>
                    </form>

                    <div className="my-6 flex items-center text-stone-300 text-xs font-bold uppercase tracking-widest">
                        <span className="h-px bg-stone-200 flex-1"></span>
                        <span className="px-4">Eller</span>
                        <span className="h-px bg-stone-200 flex-1"></span>
                    </div>

                    <button 
                        onClick={() => { onClose(); onGoogleLogin(); }}
                        className="w-full bg-white border border-stone-200 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Fortsett med Google</span>
                    </button>
                </div>

                <div className="bg-stone-50 p-4 text-center border-t border-stone-100">
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                        className="text-sm text-stone-600 hover:text-stone-900 font-medium"
                    >
                        {isSignUp ? 'Har du allerede konto? Logg inn' : 'Ny her? Opprett konto'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LANDING);
  const [activeCourse, setActiveCourse] = useState<Course | undefined>(undefined);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Used for loading spinner on buttons
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Listen for auth state changes & enforce whitelist
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // SJEKK OM BRUKEREN ER PÅ LISTEN
        if (currentUser.email && ALLOWED_EMAILS.includes(currentUser.email)) {
            setUser(currentUser);
            setAuthError(null);
        } else {
            // Ikke godkjent bruker
            console.warn(`Tilgang nektet for ${currentUser.email}. Logger ut.`);
            await signOut(auth);
            setUser(null);
            setAuthError("Tilgang nektet: E-postadressen din står ikke på listen over godkjente brukere.");
            setViewMode(ViewMode.LANDING);
        }
      } else {
        setUser(null);
      }
      setIsLoggingIn(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch courses from Firestore
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedCourses: Course[] = [];
        
        querySnapshot.forEach((doc) => {
          fetchedCourses.push(doc.data() as Course);
        });

        if (fetchedCourses.length === 0) {
            console.log("Ingen kurs funnet i databasen, viser demokurs.");
            setCourses([SAMPLE_COURSE]); 
        } else {
            console.log(`Hentet ${fetchedCourses.length} kurs fra databasen.`);
            setCourses(fetchedCourses);
        }
      } catch (error: any) {
        console.error("Feil ved henting av kurs: ", error);
        
        // Viser spesifikk feilmelding i konsollen hvis det er rettighetsproblemer
        if (error.code === 'permission-denied') {
            console.error("FIRESTORE PERMISSION DENIED: Sjekk 'Rules' i Firebase Console. De må tillate lesing.");
        }

        // Fallback to demo if fetching fails
        setCourses([SAMPLE_COURSE]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handleGoogleLogin = async () => {
      setIsLoggingIn(true);
      setAuthError(null);
      setShowLoginModal(false); // Close modal if open
      try {
          await signInWithPopup(auth, googleProvider);
          // Whitelist sjekkes i onAuthStateChanged
      } catch (error: any) {
          console.error("Login failed:", error);
          setAuthError("Innlogging feilet. Vennligst prøv igjen.");
          setIsLoggingIn(false);
      }
  };

  const handleLogout = async () => {
      await signOut(auth);
      setUser(null);
      setViewMode(ViewMode.LANDING);
  };

  const handleSaveCourse = async (savedCourse: Course) => {
      if (!user) return;

      // Add metadata
      const courseToSave: Course = {
          ...savedCourse,
          authorId: user.uid,
          createdAt: savedCourse.createdAt || Date.now()
      };

      try {
          // Save to Firestore
          await setDoc(doc(db, "courses", courseToSave.id), courseToSave);
          
          // Update local state
          setCourses(prev => {
              const exists = prev.find(c => c.id === courseToSave.id);
              if (exists) {
                  return prev.map(c => c.id === courseToSave.id ? courseToSave : c);
              }
              return [courseToSave, ...prev];
          });
          
          setActiveCourse(courseToSave);
          setViewMode(ViewMode.STUDENT);
      } catch (error: any) {
          console.error("Error saving course: ", error);
          if (error.code === 'permission-denied') {
              alert("Kunne ikke lagre. Du mangler skriverettigheter til databasen (sjekk Firestore Rules).");
          } else {
              alert("Kunne ikke lagre kurset. Sjekk konsollen for detaljer.");
          }
      }
  };

  const openCourse = (course: Course) => {
      setActiveCourse(course);
      setViewMode(ViewMode.STUDENT);
  };

  const editCourse = (e: React.MouseEvent, course: Course) => {
      e.stopPropagation();
      if (!user) return;
      
      setActiveCourse(course);
      setViewMode(ViewMode.CREATOR);
  };

  const createNewCourse = () => {
      if (!user) {
          setShowLoginModal(true);
          return;
      }
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
    <div className="min-h-screen bg-[#FDFCF8] text-stone-900 flex flex-col font-sans transition-colors duration-500">
      
      {/* Login Modal Overlay */}
      {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onGoogleLogin={handleGoogleLogin} 
          />
      )}

      {/* Navigation */}
      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto w-full z-50">
          <div className="font-serif text-2xl font-bold tracking-tight flex items-center gap-2 cursor-pointer group" onClick={() => setViewMode(ViewMode.LANDING)}>
              <div className="w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center font-serif italic shadow-lg group-hover:scale-110 transition-transform">L</div>
              <span className="group-hover:text-stone-600 transition-colors">Lumière</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm font-medium text-stone-500">
              <button className="hover:text-stone-900 transition hidden md:block">Bibliotek</button>
              
              {user ? (
                  <div className="flex items-center gap-4 pl-6 border-l border-stone-200">
                      <button 
                        onClick={createNewCourse}
                        className="hover:text-stone-900 transition bg-stone-900 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md hover:shadow-lg hover:bg-stone-800"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nytt Kurs</span>
                      </button>
                      <div className="relative group cursor-pointer">
                          {user.photoURL ? (
                              <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border border-stone-200" />
                          ) : (
                              <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-serif">
                                  {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                              </div>
                          )}
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                              <div className="px-4 py-2 border-b border-stone-50">
                                  <p className="text-stone-900 font-bold truncate">{user.displayName || 'Bruker'}</p>
                                  <p className="text-xs text-stone-400 truncate">{user.email}</p>
                              </div>
                              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-500 hover:bg-stone-50 flex items-center gap-2">
                                  <LogOut className="w-3 h-3" /> Logg ut
                              </button>
                          </div>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="text-stone-600 hover:text-stone-900 transition flex items-center gap-2 px-4 py-2 rounded-full hover:bg-stone-100"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Logg inn</span>
                  </button>
              )}
          </div>
      </nav>

      {/* Auth Error Warning */}
      {authError && (
          <div className="max-w-md mx-auto mt-4 px-6 animate-fade-in-up">
              <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm shadow-sm">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <p>{authError}</p>
                  <button onClick={() => setAuthError(null)} className="ml-auto text-red-400 hover:text-red-800">X</button>
              </div>
          </div>
      )}

      {/* Hero Section */}
      <header className="px-6 text-center max-w-4xl mx-auto mt-12 mb-24 animate-fade-in-up">
          <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-stone-100 text-stone-500 text-xs font-bold tracking-[0.2em] uppercase border border-stone-200">
              Læringsplattform
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-stone-900 mb-8 leading-[1.1] tracking-tight">
            Lær som om du ser <br/> <span className="italic text-stone-500 bg-gradient-to-r from-stone-500 to-stone-400 bg-clip-text text-transparent">på en film.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              En digital opplevelse designet for dybde, ro og forståelse. 
              {user ? ' Velkommen tilbake, skaper.' : ' Logg inn for å dele din kunnskap.'}
          </p>
          
          {user ? (
               <button 
                onClick={createNewCourse}
                className="flex items-center space-x-3 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl mx-auto group"
              >
                  <PenTool className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="font-medium">Gå til Skaperstudio</span>
              </button>
          ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center space-x-3 bg-white text-stone-800 border border-stone-200 px-8 py-4 rounded-full hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm hover:shadow-md mx-auto"
              >
                  <LogIn className="w-5 h-5 text-stone-600" />
                  <span className="font-medium">Start reisen</span>
              </button>
          )}
      </header>

      {/* Course Grid / Overview */}
      <section className="max-w-7xl mx-auto w-full px-6 pb-24">
          <div className="flex items-center justify-between mb-12 border-b border-stone-200 pb-4">
             <h2 className="font-serif text-3xl text-stone-800">Bibliotek</h2>
             <span className="text-stone-400 text-sm bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                 {loadingCourses ? 'Laster...' : `${courses.length} Kurs`}
             </span>
          </div>

          {loadingCourses ? (
              <div className="flex justify-center py-20">
                  <div className="flex flex-col items-center gap-3 text-stone-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm uppercase tracking-widest">Henter data...</span>
                  </div>
              </div>
          ) : (
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

                              {/* Edit Button on Card (Visible for allowed users) */}
                              {user && (
                                <button 
                                    onClick={(e) => editCourse(e, course)}
                                    className="absolute top-4 right-4 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm z-20"
                                    title="Rediger Kurs"
                                >
                                    <Edit2 className="w-4 h-4 text-stone-600"/>
                                </button>
                              )}
                          </div>
                          
                          <div className="px-2">
                              <div className="flex items-center space-x-2 mb-3">
                                 <span className="h-px w-8 bg-stone-300"></span>
                                 <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
                                    {course.category || "Kurs"}
                                 </span>
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

                  {/* New Course Card (Only visible if logged in) */}
                  {user && (
                      <button 
                        onClick={createNewCourse}
                        className="group flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all duration-300"
                      >
                          <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-white flex items-center justify-center text-stone-400 group-hover:text-stone-900 transition-colors mb-4 shadow-sm">
                              <Plus className="w-6 h-6" />
                          </div>
                          <span className="font-serif text-lg text-stone-400 group-hover:text-stone-900">
                            Opprett ny historie
                          </span>
                      </button>
                  )}
              </div>
          )}
      </section>

      <footer className="p-12 text-center border-t border-stone-100 bg-white mt-auto">
          <div className="flex flex-col items-center space-y-4">
            <div className="font-serif italic text-stone-400 text-lg">Lumière</div>
            <p className="text-stone-400 text-xs">
                &copy; 2024 Lumière Læringsplattform. Drevet av Gemini & Firebase.
            </p>
          </div>
      </footer>
    </div>
  );
}

export default App;
