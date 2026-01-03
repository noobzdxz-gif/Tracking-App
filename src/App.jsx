import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Menu, X, LogOut, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import DayDetailView from '@/components/DayDetailView';
import CalendarView from '@/components/CalendarView';
import SummaryView from '@/components/SummaryView';
import ExportDialog from '@/components/ExportDialog';

// --- Main App Component ---
function App() {
    const [session, setSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);

    // Data State
    const [entries, setEntries] = useState({});
    const [savedOptions, setSavedOptions] = useState({ time: [], expense: [] });

    // UI State
    const [currentView, setCurrentView] = useState('today'); // 'today', 'weekly', 'monthly', 'calendar'
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);

    // Auth & Data Fetching
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoadingSession(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchEntries();
                fetchOptions();
            } else {
                setEntries({});
                setSavedOptions({ time: [], expense: [] });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoadingData(true);
            const { data, error } = await supabase.from('entries').select('*').order('created_at', { ascending: true });
            if (error) throw error;

            const nestedData = {};
            data.forEach(row => {
                if (!nestedData[row.date]) nestedData[row.date] = { time: [], expense: [] };
                const entry = {
                    id: row.id,
                    task: row.type === 'time' ? row.content : undefined,
                    duration: row.type === 'time' ? Number(row.value) : undefined,
                    startTime: row.start_time,
                    endTime: row.end_time,
                    description: row.type === 'expense' ? row.content : undefined,
                    amount: row.type === 'expense' ? Number(row.value) : undefined,
                };
                nestedData[row.date][row.type].push(entry);
            });
            setEntries(nestedData);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const { data, error } = await supabase.from('saved_options').select('*');
            if (error && error.code !== 'PGRST116') return; // Ignore if table doesn't exist yet

            if (data) {
                const opts = { time: [], expense: [] };
                data.forEach(row => {
                    if (opts[row.type]) opts[row.type].push(row.content);
                });
                setSavedOptions(opts);
            }
        } catch (err) {
            console.error("Error fetching options:", err);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setCurrentView('today');
    };

    // --- CRUD Operations ---

    const saveEntry = async (date, type, data, editingId = null) => {
        const dbRow = {
            date: date,
            type: type,
            content: type === 'time' ? data.task : data.description,
            value: type === 'time' ? data.duration : data.amount,
            start_time: type === 'time' ? data.startTime : null,
            end_time: type === 'time' ? data.endTime : null,
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('entries').update(dbRow).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('entries').insert([dbRow]);
                if (error) throw error;
            }
            fetchEntries();
        } catch (err) {
            alert("Failed to save: " + err.message);
        }
    };

    const deleteEntry = async (date, type, id) => {
        // Optimistic Update
        const originalEntries = entries;
        setEntries(prev => {
            const dateEntries = prev[date];
            if (!dateEntries) return prev;
            return {
                ...prev,
                [date]: { ...dateEntries, [type]: dateEntries[type].filter(e => e.id !== id) }
            };
        });

        try {
            const { error } = await supabase.from('entries').delete().eq('id', id);
            if (error) throw error;
        } catch (err) {
            alert("Failed to delete.");
            setEntries(originalEntries);
        }
    };

    const saveNewOption = async (type, content) => {
        if (!content) return;
        try {
            setSavedOptions(prev => ({ ...prev, [type]: [...prev[type], content] }));
            await supabase.from('saved_options').insert([{ type, content }]);
        } catch (err) {
            console.error("Error saving option:", err);
        }
    };

    // --- Render ---

    if (loadingSession) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    if (!session) return <Auth />;

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-4 font-sans max-w-5xl mx-auto selection:bg-zinc-800">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-4">
                <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
                    TRACKER
                </h1>
                <div className="flex gap-4 items-center">
                    <span className="hidden md:inline text-xs font-mono text-zinc-500">{session.user.email}</span>
                    <div className="relative">
                        <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 h-auto text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </Button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-zinc-800 shadow-xl rounded-md z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <nav className="flex flex-col">
                                    <NavButton label="TODAY" active={currentView === 'today'} onClick={() => { setSelectedDate(format(new Date(), 'yyyy-MM-dd')); setCurrentView('today'); setIsMenuOpen(false); }} />
                                    <NavButton label="CALENDAR" active={currentView === 'calendar'} onClick={() => { setCurrentView('calendar'); setIsMenuOpen(false); }} />
                                    <NavButton label="WEEKLY SUMMARY" active={currentView === 'weekly'} onClick={() => { setCurrentView('weekly'); setIsMenuOpen(false); }} />
                                    <NavButton label="MONTHLY SUMMARY" active={currentView === 'monthly'} onClick={() => { setCurrentView('monthly'); setIsMenuOpen(false); }} />

                                    <button className="px-4 py-3 text-left hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors border-b border-zinc-900 last:border-0 font-medium text-sm flex items-center gap-2"
                                        onClick={() => { setShowExport(true); setIsMenuOpen(false); }}>
                                        <FileDown size={16} /> EXPORT DATA
                                    </button>

                                    <button className="px-4 py-3 text-left hover:bg-red-900/10 text-red-400 hover:text-red-300 transition-colors font-medium text-sm flex items-center gap-2"
                                        onClick={handleSignOut}>
                                        <LogOut size={16} /> LOGOUT
                                    </button>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {error && <div className="text-red-500 text-center py-10">Error: {error}</div>}

                {currentView === 'today' || currentView === 'day_detail' ? (
                    <DayDetailView
                        date={selectedDate}
                        data={entries[selectedDate] || { time: [], expense: [] }}
                        onSave={saveEntry}
                        onDelete={deleteEntry}
                        isToday={currentView === 'today'}
                        savedOptions={savedOptions}
                        onSaveOption={saveNewOption}
                    />
                ) : null}

                {currentView === 'weekly' && <SummaryView type="week" entries={entries} />}
                {currentView === 'monthly' && <SummaryView type="month" entries={entries} />}

                {currentView === 'calendar' && (
                    <CalendarView
                        entries={entries}
                        onSelectDate={(date) => {
                            setSelectedDate(date);
                            setCurrentView('day_detail');
                        }}
                    />
                )}
            </main>

            {showExport && (
                <ExportDialog
                    entries={entries}
                    onClose={() => setShowExport(false)}
                />
            )}
        </div>
    );
}

function NavButton({ label, onClick, active }) {
    return (
        <button
            className={`px-4 py-3 text-left transition-colors border-b border-zinc-900 last:border-0 font-medium text-sm ${active ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
            onClick={onClick}
        >
            {label}
        </button>
    )
}

export default App;
