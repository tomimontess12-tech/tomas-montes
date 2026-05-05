/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot,
  Timestamp,
  doc,
  getDocFromServer,
  where,
  addDoc
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { db, auth, googleProvider } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  LogOut, 
  LogIn, 
  Trophy, 
  Plus, 
  ChevronRight,
  Database,
  History,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addHours, startOfHour, isAfter } from 'date-fns';
import { cn } from './lib/utils';

// Types
interface Field {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
  imageUrl: string;
  description: string;
}

interface Reservation {
  id: string;
  fieldId: string;
  userId: string;
  userEmail: string;
  userName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Timestamp;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isReserving, setIsReserving] = useState(false);
  const [view, setView] = useState<'fields' | 'my-reservations'>('fields');

  // Test connection on mount
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'fields'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fieldList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Field));
      setFields(fieldList);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'fields'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setReservations([]);
      return;
    }

    const q = query(collection(db, 'reservations'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      setReservations(resList.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis()));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reservations'));

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const seedData = async () => {
    const demoFields = [
      {
        name: "Cancha Central de Fútbol 5",
        type: "Fútbol",
        pricePerHour: 12000,
        imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800",
        description: "Pasto sintético de última generación reforzado."
      },
      {
        name: "Pista de Pádel 'El Rayo'",
        type: "Pádel",
        pricePerHour: 8000,
        imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800",
        description: "Cristal templado y superficie azul profesional."
      },
      {
        name: "Court de Tenis Polvo de Ladrillo",
        type: "Tenis",
        pricePerHour: 10000,
        imageUrl: "https://images.unsplash.com/photo-1595435064219-c78ca72f0db4?auto=format&fit=crop&q=80&w=800",
        description: "Mantenimiento diario, excelente drenaje."
      }
    ];

    try {
      for (const f of demoFields) {
        await addDoc(collection(db, 'fields'), f);
      }
      alert("¡Canchas de ejemplo agregadas con éxito!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'fields');
    }
  };

  const handleReserve = async (field: Field) => {
    if (!user) {
      await login();
      return;
    }
    
    setIsReserving(true);
    try {
      const now = startOfHour(addHours(new Date(), 1));
      const end = addHours(now, 1);

      await addDoc(collection(db, 'reservations'), {
        fieldId: field.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        startTime: Timestamp.fromDate(now),
        endTime: Timestamp.fromDate(end),
        status: 'confirmed',
        createdAt: Timestamp.now()
      });
      
      alert(`Reserva confirmada para ${field.name} a las ${format(now, 'HH:mm')}`);
      setView('my-reservations');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reservations');
    } finally {
      setIsReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('fields')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Trophy size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">CanchaConnect</h1>
          </div>

          <nav className="flex items-center space-x-6">
            <button 
              onClick={() => setView('fields')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'fields' ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Canchas
            </button>
            {user && (
              <button 
                onClick={() => setView('my-reservations')}
                className={cn(
                  "text-sm font-medium transition-colors",
                  view === 'my-reservations' ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                )}
              >
                Mis Reservas
              </button>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <LogIn size={18} />
                <span>Ingresar</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'fields' ? (
            <motion.div
              key="fields"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Reserva tu cancha</h2>
                  <p className="text-slate-500 max-w-lg">
                    Encuentra el lugar perfecto para tu próximo partido. Fútbol, pádel, tenis y más.
                  </p>
                </div>
                {fields.length === 0 && (
                  <button 
                    onClick={seedData}
                    className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-all text-sm font-medium"
                  >
                    <Plus size={18} />
                    <span>Cargar canchas de ejemplo</span>
                  </button>
                )}
              </div>

              {fields.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">No hay canchas disponibles</h3>
                  <p className="text-slate-500 mb-6">Usa el botón de arriba para cargar datos de ejemplo en tu base de datos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fields.map((field) => (
                    <motion.div 
                      key={field.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all"
                    >
                      <div className="h-48 overflow-hidden relative">
                        <img 
                          src={field.imageUrl} 
                          alt={field.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                          {field.type}
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{field.name}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{field.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Precio / Hora</p>
                            <p className="text-lg font-bold text-indigo-600">${field.pricePerHour.toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => handleReserve(field)}
                            disabled={isReserving}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                          >
                            <span>Reservar</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="reservations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Mis Reservas</h2>
                <p className="text-slate-500">Gestiona tus próximos turnos y revisa tu historial.</p>
              </div>

              {reservations.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">Aún no tienes reservas</h3>
                  <p className="text-slate-500 mb-6">Explora las canchas y agenda tu primer partido.</p>
                  <button 
                    onClick={() => setView('fields')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Ver canchas disponibles
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl">
                  {reservations.map((res) => {
                    const field = fields.find(f => f.id === res.fieldId);
                    const isPast = isAfter(new Date(), res.startTime.toDate());
                    
                    return (
                      <div 
                        key={res.id}
                        className={cn(
                          "bg-white rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all",
                          isPast ? "border-slate-100 opacity-75" : "border-slate-200 shadow-sm"
                        )}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            isPast ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
                          )}>
                            <Calendar size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{field?.name || 'Cancha cargando...'}</h4>
                            <div className="flex items-center space-x-3 text-sm text-slate-500 mt-1">
                              <span className="flex items-center space-x-1">
                                <Clock size={14} />
                                <span>{format(res.startTime.toDate(), 'dd/MM HH:mm')}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <History size={14} />
                                <span>1h</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end md:space-x-6">
                          <div className="flex items-center space-x-1.5">
                            {res.status === 'confirmed' ? (
                              <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-100">
                                <CheckCircle2 size={14} />
                                <span>Confirmado</span>
                              </div>
                            ) : res.status === 'pending' ? (
                              <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-amber-100">
                                <Clock3 size={14} />
                                <span>Pendiente</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100">
                                <XCircle size={14} />
                                <span>Cancelado</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium">ID Reserva</p>
                            <p className="text-[10px] font-mono text-slate-400">#{res.id.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <Trophy size={24} />
              <span className="text-xl font-bold">CanchaConnect</span>
            </div>
            <p className="text-sm">
              La plataforma líder para deportistas aficionados. Reservas rápidas, seguras y sin complicaciones.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setView('fields')} className="hover:text-white transition-colors">Explorar Canchas</button></li>
              <li><button className="hover:text-white transition-colors cursor-not-allowed">Precios (Próximamente)</button></li>
              <li><button className="hover:text-white transition-colors cursor-not-allowed">App Móvil</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold">Acceso a Base de Datos</h4>
            <p className="text-xs text-slate-500">
              Gestiona la información directamente en el panel de Firebase.
            </p>
            <div className="flex flex-col space-y-2">
              <a 
                href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/firestore/databases/ai-studio-fe81aadc-529a-462f-9d79-ca339d3f3933/data`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center space-x-2 bg-slate-800 text-indigo-400 px-4 py-2 rounded-xl hover:bg-slate-700 transition-all text-sm font-medium border border-slate-700"
              >
                <Database size={16} />
                <span>Consola de Base de Datos</span>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
          &copy; {new Date().getFullYear()} CanchaConnect. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
