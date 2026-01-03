import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, differenceInMinutes, parse, isSameMonth, isSameDay, addMonths, subMonths, isValid } from 'date-fns';
import { Menu, X, Trash2, Plus, Clock, DollarSign, Loader2, Database, Calendar as CalendarIcon, LogOut, Edit2, Check, ChevronLeft, ChevronRight, Calculator, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';

// --- Helper: Smart Time Parser ---
const parseSmartTime = (input) => {
    if (!input) return null;
    const clean = input.toLowerCase().replace(/\s+/g, ' ').trim();
    const parts = clean.split(/\s+(?:to|-|until)\s+/);
    if (parts.length !== 2) return null;

    const parsePart = (str) => {
        const formats = ['HH:mm', 'H:mm', 'h:mm a', 'h:mma', 'ha', 'h a'];
        const referenceDate = new Date();
        for (let fmt of formats) {
            const d = parse(str, fmt, referenceDate);
            if (isValid(d)) return format(d, 'HH:mm');
        }
        return null;
    };

    const start = parsePart(parts[0]);
    const end = parsePart(parts[1]);
    if (start && end) return { start, end };
    return null;
};

// --- Main App Component ---
function App() {
    const [session, setSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);

    // Data State
    const [entries, setEntries] = useState({});
    const [savedOptions, setSavedOptions] = useState({ time: [], expense: [] });

    // UI State
    const [currentView, setCurrentView] = useState('today');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);

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
            if (error) {
                console.warn("Could not fetch options (table might not exist yet):", error.message);
                return;
            }
            const opts = { time: [], expense: [] };
            data.forEach(row => {
                if (opts[row.type]) opts[row.type].push(row.content);
            });
            setSavedOptions(opts);
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
            console.error("Error saving entry:", err);
            alert("Failed to save. " + err.message);
        }
    };

    const deleteEntry = async (date, type, id) => {
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
            console.error("Error deleting entry:", err);
            alert("Failed to delete.");
            setEntries(originalEntries);
        }
    };

    const saveNewOption = async (type, content) => {
        if (!content) return;
        try {
            // Optimistic update
            setSavedOptions(prev => ({
                ...prev,
                [type]: [...prev[type], content]
            }));

            const { error } = await supabase.from('saved_options').insert([{ type, content }]);
            if (error) throw error;
        } catch (err) {
            console.error("Error saving option:", err);
            alert("Could not save default option. " + err.message);
        }
    };

    // --- Render Views ---

    const renderView = () => {
        if (error) return <div className="text-red-500 text-center py-20">Error: {error}</div>;

        switch (currentView) {
            case 'today':
            case 'day_detail':
                return <DayDetailView
                    date={selectedDate}
                    data={entries[selectedDate] || { time: [], expense: [] }}
                    onSave={saveEntry}
                    onDelete={deleteEntry}
                    isToday={currentView === 'today'}
                    savedOptions={savedOptions}
                    onSaveOption={saveNewOption}
                />;
            case 'weekly':
                return <SummaryView type="week" entries={entries} />;
            case 'monthly':
                return <SummaryView type="month" entries={entries} />;
            case 'calendar':
                return <CalendarView
                    entries={entries}
                    onSelectDate={(date) => {
                        setSelectedDate(date);
                        setCurrentView('day_detail');
                    }}
                />;
            default:
                return null;
        }
    };

    if (loadingSession) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    if (!session) return <Auth />;

    return (
        <div className="min-h-screen bg-black text-white p-4 font-sans max-w-5xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b-4 border-white pb-4">
                <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                    TRACKER
                </h1>
                <div className="flex gap-4 items-center">
                    <span className="hidden md:inline text-xs font-mono text-gray-400">{session.user.email}</span>
                    <div className="relative">
                        <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 h-auto">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </Button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-black border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50">
                                <nav className="flex flex-col">
                                    <button className="px-4 py-3 text-left hover:bg-white hover:text-black transition-colors border-b-2 border-white font-bold"
                                        onClick={() => { setSelectedDate(format(new Date(), 'yyyy-MM-dd')); setCurrentView('today'); setIsMenuOpen(false); }}>
                                        TODAY
                                    </button>
                                    <button className="px-4 py-3 text-left hover:bg-white hover:text-black transition-colors border-b-2 border-white font-bold"
                                        onClick={() => { setCurrentView('calendar'); setIsMenuOpen(false); }}>
                                        CALENDAR
                                    </button>
                                    <button className="px-4 py-3 text-left hover:bg-white hover:text-black transition-colors border-b-2 border-white font-bold"
                                        onClick={() => { setCurrentView('weekly'); setIsMenuOpen(false); }}>
                                        WEEKLY VIEW
                                    </button>
                                    <button className="px-4 py-3 text-left hover:bg-white hover:text-black transition-colors border-b-2 border-white font-bold"
                                        onClick={() => { setCurrentView('monthly'); setIsMenuOpen(false); }}>
                                        MONTHLY VIEW
                                    </button>
                                    <button className="px-4 py-3 text-left hover:bg-red-600 hover:text-white transition-colors font-bold text-gray-400 flex items-center gap-2"
                                        onClick={handleSignOut}>
                                        <LogOut size={16} /> LOGOUT
                                    </button>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <main>{renderView()}</main>
        </div>
    );
}

// --- Sub-components ---

function DayDetailView({ date, data, onSave, onDelete, isToday, savedOptions, onSaveOption }) {
    // Time Form
    const [editingTimeId, setEditingTimeId] = useState(null);
    const [timeTask, setTimeTask] = useState('');
    const [smartTimeInput, setSmartTimeInput] = useState('');
    const [showPickers, setShowPickers] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Expense Form
    const [editingExpId, setEditingExpId] = useState(null);
    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');

    // Sync manual pickers
    useEffect(() => {
        if (startTime && endTime) setSmartTimeInput(`${startTime} - ${endTime}`);
    }, [startTime, endTime]);

    const handleSmartInputBlur = () => {
        const parsed = parseSmartTime(smartTimeInput);
        if (parsed) {
            setStartTime(parsed.start);
            setEndTime(parsed.end);
        }
    };

    const calculateDuration = (start, end) => {
        if (!start || !end) return 0;
        const s = parse(start, 'HH:mm', new Date());
        const e = parse(end, 'HH:mm', new Date());
        const diffMins = differenceInMinutes(e, s);
        return diffMins > 0 ? Number((diffMins / 60).toFixed(2)) : 0;
    };

    const handleTimeSubmit = (e) => {
        e.preventDefault();
        if (!timeTask || !startTime || !endTime) return;
        const duration = calculateDuration(startTime, endTime);
        if (duration <= 0) {
            alert("End time must be after start time");
            return;
        }
        onSave(date, 'time', { task: timeTask, startTime, endTime, duration }, editingTimeId);
        setTimeTask(''); setStartTime(''); setEndTime(''); setSmartTimeInput(''); setEditingTimeId(null); setShowPickers(false);
    };

    const startEditTime = (item) => {
        setTimeTask(item.task);
        setStartTime(item.startTime || '');
        setEndTime(item.endTime || '');
        setSmartTimeInput(`${item.startTime} - ${item.endTime}`);
        setEditingTimeId(item.id);
    };

    const cancelEditTime = () => {
        setTimeTask(''); setStartTime(''); setEndTime(''); setSmartTimeInput(''); setEditingTimeId(null); setShowPickers(false);
    };

    const handleExpSubmit = (e) => {
        e.preventDefault();
        if (!expDesc || !expAmount) return;
        onSave(date, 'expense', { description: expDesc, amount: parseFloat(expAmount) }, editingExpId);
        setExpDesc(''); setExpAmount(''); setEditingExpId(null);
    };

    const startEditExp = (item) => {
        setExpDesc(item.description);
        setExpAmount(item.amount);
        setEditingExpId(item.id);
    };

    const cancelEditExp = () => {
        setExpDesc(''); setExpAmount(''); setEditingExpId(null);
    }

    const totalHours = data.time.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalExpense = data.expense.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center mb-8">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                    {format(parseISO(date), 'EEEE')}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    {!isToday && <span className="text-xs font-bold bg-white text-black px-2 py-0.5">ARCHIVE</span>}
                    <p className="text-xl font-bold text-gray-400">{format(parseISO(date), 'MMMM do, yyyy')}</p>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                {/* Expense Tracking (First) */}
                <Card className="bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] order-1">
                    <CardHeader className="bg-white text-black p-4 border-b-2 border-black flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2 text-xl font-black">
                            <DollarSign className="h-6 w-6" /> EXPENSE
                        </CardTitle>
                        <div className="text-sm font-black border-2 border-black px-2">
                            ${totalExpense.toFixed(2)}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 text-white">
                        <form onSubmit={handleExpSubmit} className={`flex flex-col gap-2 mb-6 p-4 border-2 border-dashed ${editingExpId ? 'border-yellow-400 bg-yellow-900/10' : 'border-gray-800'}`}>
                            {editingExpId && <div className="text-xs font-bold text-yellow-400 uppercase">Editing Entry</div>}
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-grow">
                                    <Input
                                        list="expense-options"
                                        placeholder="Description"
                                        value={expDesc}
                                        onChange={e => setExpDesc(e.target.value)}
                                        className="bg-black border-white text-white placeholder:text-gray-600"
                                    />
                                    <datalist id="expense-options">
                                        {savedOptions.expense.map((opt, i) => <option key={i} value={opt} />)}
                                    </datalist>
                                </div>
                                <Button type="button" onClick={() => onSaveOption('expense', expDesc)} className="px-2" title="Save as default">
                                    <Bookmark size={18} />
                                </Button>
                                <Input
                                    type="number" step="0.01" placeholder="$"
                                    className="w-24 bg-black border-white text-white"
                                    value={expAmount}
                                    onChange={e => setExpAmount(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                {editingExpId && (
                                    <Button type="button" onClick={cancelEditExp} variant="ghost" className="text-red-500 border-red-500 hover:bg-red-900/20">
                                        <X size={20} /> CANCEL
                                    </Button>
                                )}
                                <Button type="submit" className={`flex-grow ${editingExpId ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-500' : 'bg-white text-black hover:bg-gray-200'}`}>
                                    {editingExpId ? <><Check size={20} className="mr-2" /> UPDATE</> : <><Plus size={20} className="mr-2" /> ADD ENTRY</>}
                                </Button>
                            </div>
                        </form>

                        <div className="space-y-3">
                            {data.expense.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border-2 border-white bg-black group hover:border-gray-400 transition-colors">
                                    <div className="font-bold">{item.description}</div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-sm text-green-400">${item.amount}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEditExp(item)} className="text-white hover:text-yellow-400"><Edit2 size={16} /></button>
                                            <button onClick={() => onDelete(date, 'expense', item.id)} className="text-white hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {data.expense.length === 0 && <p className="text-center text-gray-600 italic text-sm py-4">No expenses logged.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Time Tracking (Second) */}
                <Card className="bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] order-2">
                    <CardHeader className="bg-white text-black p-4 border-b-2 border-black flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2 text-xl font-black">
                            <Clock className="h-6 w-6" /> TIME
                        </CardTitle>
                        <div className="text-sm font-black border-2 border-black px-2">
                            {totalHours.toFixed(2)}h
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 text-white">
                        <form onSubmit={handleTimeSubmit} className={`flex flex-col gap-2 mb-6 p-4 border-2 border-dashed ${editingTimeId ? 'border-yellow-400 bg-yellow-900/10' : 'border-gray-800'}`}>
                            {editingTimeId && <div className="text-xs font-bold text-yellow-400 uppercase mb-1">Editing Entry</div>}
                            <div className="flex gap-2 items-center">
                                <div className="flex-grow">
                                    <Input
                                        list="time-options"
                                        placeholder="Task description..."
                                        value={timeTask}
                                        onChange={e => setTimeTask(e.target.value)}
                                        className="bg-black border-white text-white placeholder:text-gray-600 focus-visible:ring-white"
                                    />
                                    <datalist id="time-options">
                                        {savedOptions.time.map((opt, i) => <option key={i} value={opt} />)}
                                    </datalist>
                                </div>
                                <Button type="button" onClick={() => onSaveOption('time', timeTask)} className="px-2" title="Save as default">
                                    <Bookmark size={18} />
                                </Button>
                            </div>

                            <div className="flex gap-2 items-center">
                                <div className="flex-grow">
                                    <Input
                                        placeholder="e.g. 6am to 2pm"
                                        value={smartTimeInput}
                                        onChange={e => setSmartTimeInput(e.target.value)}
                                        onBlur={handleSmartInputBlur}
                                        className="bg-black border-white text-white placeholder:text-gray-600 focus-visible:ring-white"
                                    />
                                </div>
                                <Button type="button" onClick={() => setShowPickers(!showPickers)} className="px-3" title="Toggle Manual Time Picker">
                                    <Clock size={20} />
                                </Button>
                            </div>

                            {showPickers && (
                                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Input type="time" className="bg-black border-white text-white w-full" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                    <span className="self-center text-gray-500">-</span>
                                    <Input type="time" className="bg-black border-white text-white w-full" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                {editingTimeId && (
                                    <Button type="button" onClick={cancelEditTime} variant="ghost" className="text-red-500 border-red-500 hover:bg-red-900/20">
                                        <X size={20} /> CANCEL
                                    </Button>
                                )}
                                <Button type="submit" className={`flex-grow ${editingTimeId ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-500' : 'bg-white text-black hover:bg-gray-200'}`}>
                                    {editingTimeId ? <><Check size={20} className="mr-2" /> UPDATE</> : <><Plus size={20} className="mr-2" /> ADD ENTRY</>}
                                </Button>
                            </div>
                        </form>

                        <div className="space-y-3">
                            {data.time.map(item => (
                                <div key={item.id} className="relative flex justify-between items-center p-3 border-2 border-white bg-black group hover:border-gray-400 transition-colors">
                                    <div>
                                        <div className="font-bold">{item.task}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">{item.startTime} - {item.endTime}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-sm">{item.duration}h</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEditTime(item)} className="text-white hover:text-yellow-400"><Edit2 size={16} /></button>
                                            <button onClick={() => onDelete(date, 'time', item.id)} className="text-white hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {data.time.length === 0 && <p className="text-center text-gray-600 italic text-sm py-4">No tasks logged.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function CalendarView({ entries, onSelectDate }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
                <Button variant="ghost" onClick={prevMonth} className="px-3"><ChevronLeft size={32} /></Button>
                <div className="text-center"><h2 className="text-4xl font-black uppercase tracking-tighter">{format(currentMonth, "MMMM yyyy")}</h2></div>
                <Button variant="ghost" onClick={nextMonth} className="px-3"><ChevronRight size={32} /></Button>
            </div>
            <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-gray-500 uppercase text-sm border-b-2 border-gray-800 pb-2">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {days.map(day => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    const dayData = entries[dStr];
                    const hasData = dayData && (dayData.time.length > 0 || dayData.expense.length > 0);
                    const isSelectedMonth = isSameMonth(day, monthStart);

                    return (
                        <div key={day} onClick={() => onSelectDate(dStr)}
                            className={`min-h-[80px] md:min-h-[120px] p-2 border-2 cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] ${isSelectedMonth ? 'bg-black border-white' : 'bg-gray-900 border-gray-700 opacity-50'} ${isSameDay(day, new Date()) ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}>
                            <div className="flex justify-between items-start">
                                <span className={`font-bold ${!isSelectedMonth ? 'text-gray-600' : 'text-white'}`}>{format(day, 'd')}</span>
                                {hasData && <div className="h-2 w-2 bg-white rounded-full"></div>}
                            </div>
                            {hasData && isSelectedMonth && (
                                <div className="mt-2 space-y-1 text-xs hidden md:block">
                                    {dayData.time.length > 0 && <div className="flex items-center gap-1 text-gray-300"><Clock size={10} /> <span>{dayData.time.reduce((acc, t) => acc + t.duration, 0).toFixed(1)}h</span></div>}
                                    {dayData.expense.length > 0 && <div className="flex items-center gap-1 text-green-400"><DollarSign size={10} /> <span>${dayData.expense.reduce((acc, e) => acc + e.amount, 0).toFixed(0)}</span></div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SummaryView({ type, entries }) {
    const now = new Date();
    const start = type === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
    const end = type === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    let totalTime = 0;
    let totalMoney = 0;
    const taskSummary = {};

    days.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        const dayData = entries[dStr];
        if (dayData) {
            if (dayData.time) dayData.time.forEach(t => { totalTime += (t.duration || 0); taskSummary[t.task] = (taskSummary[t.task] || 0) + t.duration; });
            if (dayData.expense) dayData.expense.forEach(e => { totalMoney += (e.amount || 0); });
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">{type === 'week' ? 'Weekly Summary' : 'Monthly Summary'}</h2>
                <p className="text-xl font-bold text-gray-400 mt-2">{format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}</p>
            </div>

            <div className="flex flex-col gap-8">
                {/* Expense Summary (Top) */}
                <Card className="bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] order-1">
                    <CardHeader className="bg-white text-black p-4"><CardTitle className="text-xl flex items-center gap-2 font-black"><DollarSign className="h-6 w-6" /> TOTAL SPENT: ${totalMoney.toFixed(2)}</CardTitle></CardHeader>
                    <CardContent className="p-6 text-white">
                        <div className="p-8 text-center border-2 border-white border-dashed bg-gray-900">
                            <div className="text-sm font-bold text-gray-400 uppercase mb-2">Total Expenses</div>
                            <div className="text-6xl font-black">${totalMoney.toFixed(2)}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Time Summary (Bottom) */}
                <Card className="bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] order-2">
                    <CardHeader className="bg-white text-black p-4"><CardTitle className="text-xl flex items-center gap-2 font-black"><Clock className="h-6 w-6" /> TOTAL TIME: {totalTime.toFixed(1)}h</CardTitle></CardHeader>
                    <CardContent className="p-6 text-white">
                        <h3 className="font-bold border-b-2 border-white pb-2 mb-4">Breakdown by Task</h3>
                        <div className="space-y-2">
                            {Object.entries(taskSummary).length > 0 ? (
                                Object.entries(taskSummary).sort(([, a], [, b]) => b - a).map(([task, duration]) => (
                                    <div key={task} className="flex justify-between items-center border-b border-gray-800 py-2">
                                        <span className="font-medium">{task}</span>
                                        <span className="font-mono font-bold">{duration.toFixed(1)}h</span>
                                    </div>
                                ))
                            ) : <p className="text-gray-600 italic">No tasks recorded.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default App;
