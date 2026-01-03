import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Menu, X, Trash2, Plus, Clock, DollarSign, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

// --- Main App Component ---
function App() {
    const [entries, setEntries] = useState({});
    const [currentView, setCurrentView] = useState('today'); // 'today', 'weekly', 'monthly'
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch initial data
    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('entries')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Transform flat SQL data to nested state object: { "YYYY-MM-DD": { time: [], expense: [] } }
            const nestedData = {};
            data.forEach(row => {
                if (!nestedData[row.date]) {
                    nestedData[row.date] = { time: [], expense: [] };
                }
                // Map DB columns to UI shape
                const entry = {
                    id: row.id,
                    task: row.type === 'time' ? row.content : undefined,
                    duration: row.type === 'time' ? Number(row.value) : undefined,
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
            setLoading(false);
        }
    };

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const addEntry = async (date, type, data) => {
        // Optimistic Update
        const tempId = Date.now();
        const optimisticEntry = { id: tempId, ...data };

        setEntries(prev => {
            const dateEntries = prev[date] || { time: [], expense: [] };
            return {
                ...prev,
                [date]: {
                    ...dateEntries,
                    [type]: [...(dateEntries[type] || []), optimisticEntry]
                }
            };
        });

        try {
            // DB Insert
            const dbRow = {
                date: date,
                type: type,
                content: type === 'time' ? data.task : data.description,
                value: type === 'time' ? data.duration : data.amount
            };

            const { data: inserted, error } = await supabase
                .from('entries')
                .insert([dbRow])
                .select()
                .single();

            if (error) throw error;

            // Replace temp ID with real DB ID
            setEntries(prev => {
                const dateEntries = prev[date];
                const updatedList = dateEntries[type].map(e =>
                    e.id === tempId ? { ...e, id: inserted.id } : e
                );
                return {
                    ...prev,
                    [date]: { ...dateEntries, [type]: updatedList }
                };
            });

        } catch (err) {
            console.error("Error adding entry:", err);
            alert("Failed to save entry to cloud. Please try again.");
            // Revert optimistic update
            fetchEntries();
        }
    };

    const deleteEntry = async (date, type, id) => {
        // Optimistic Delete
        const originalEntries = entries;
        setEntries(prev => {
            const dateEntries = prev[date];
            if (!dateEntries) return prev;
            return {
                ...prev,
                [date]: {
                    ...dateEntries,
                    [type]: dateEntries[type].filter(e => e.id !== id)
                }
            };
        });

        try {
            const { error } = await supabase
                .from('entries')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error("Error deleting entry:", err);
            alert("Failed to delete from cloud.");
            setEntries(originalEntries); // Revert
        }
    };

    const renderView = () => {
        if (loading && Object.keys(entries).length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-xl font-bold">Syncing with database...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-red-600">
                    <Database className="h-10 w-10 mb-4" />
                    <p className="text-xl font-bold">Connection Error</p>
                    <p>{error}</p>
                    <p className="text-sm text-black mt-4">Please check your .env.local keys</p>
                </div>
            );
        }

        switch (currentView) {
            case 'today':
                return <TodayView
                    date={todayStr}
                    data={entries[todayStr] || { time: [], expense: [] }}
                    onAdd={addEntry}
                    onDelete={deleteEntry}
                />;
            case 'weekly':
                return <SummaryView type="week" entries={entries} />;
            case 'monthly':
                return <SummaryView type="month" entries={entries} />;
            default:
                return <TodayView date={todayStr} data={entries[todayStr]} onAdd={addEntry} onDelete={deleteEntry} />;
        }
    };

    return (
        <div className="min-h-screen bg-white text-black p-4 font-sans max-w-5xl mx-auto">
            {/* Header / Navigation */}
            <header className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-2">
                    TRACKER <span className="text-xs bg-black text-white px-1 py-0.5 rounded">CLOUD</span>
                </h1>
                <div className="relative">
                    <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 h-auto border-2 border-black">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </Button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                            <nav className="flex flex-col">
                                <button
                                    className={`px-4 py-3 text-left hover:bg-black hover:text-white transition-colors border-b-2 border-black last:border-0 font-bold ${currentView === 'today' ? 'bg-black text-white' : ''}`}
                                    onClick={() => { setCurrentView('today'); setIsMenuOpen(false); }}
                                >
                                    TODAY
                                </button>
                                <button
                                    className={`px-4 py-3 text-left hover:bg-black hover:text-white transition-colors border-b-2 border-black last:border-0 font-bold ${currentView === 'weekly' ? 'bg-black text-white' : ''}`}
                                    onClick={() => { setCurrentView('weekly'); setIsMenuOpen(false); }}
                                >
                                    WEEKLY SUMMARY
                                </button>
                                <button
                                    className={`px-4 py-3 text-left hover:bg-black hover:text-white transition-colors last:border-0 font-bold ${currentView === 'monthly' ? 'bg-black text-white' : ''}`}
                                    onClick={() => { setCurrentView('monthly'); setIsMenuOpen(false); }}
                                >
                                    MONTHLY SUMMARY
                                </button>
                            </nav>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main>
                {renderView()}
            </main>
        </div>
    );
}

// --- Sub-components ---

function TodayView({ date, data, onAdd, onDelete }) {
    // Local state for inputs
    const [timeTask, setTimeTask] = useState('');
    const [timeDuration, setTimeDuration] = useState('');
    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');

    const handleTimeSubmit = (e) => {
        e.preventDefault();
        if (!timeTask || !timeDuration) return;
        onAdd(date, 'time', { task: timeTask, duration: parseFloat(timeDuration) });
        setTimeTask('');
        setTimeDuration('');
    };

    const handleExpSubmit = (e) => {
        e.preventDefault();
        if (!expDesc || !expAmount) return;
        onAdd(date, 'expense', { description: expDesc, amount: parseFloat(expAmount) });
        setExpDesc('');
        setExpAmount('');
    };

    const totalHours = data.time.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalExpense = data.expense.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-6xl font-black uppercase tracking-tighter">
                    {format(parseISO(date), 'EEEE')}
                </h2>
                <p className="text-xl font-bold text-gray-500 mt-2">{format(parseISO(date), 'MMMM do, yyyy')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Time Tracking Section */}
                <Card className="shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="bg-black text-white p-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Clock className="h-6 w-6" /> TIME TRACKING
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="mb-6 p-4 border-2 border-black bg-gray-50">
                            <div className="text-sm font-bold text-gray-500 uppercase">Total Hours Today</div>
                            <div className="text-4xl font-black">{totalHours.toFixed(2)}h</div>
                        </div>

                        <form onSubmit={handleTimeSubmit} className="flex gap-2 mb-6">
                            <Input
                                placeholder="Task name"
                                value={timeTask}
                                onChange={e => setTimeTask(e.target.value)}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="Hrs"
                                className="w-20"
                                value={timeDuration}
                                onChange={e => setTimeDuration(e.target.value)}
                            />
                            <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                                <Plus size={20} />
                            </Button>
                        </form>

                        <div className="space-y-3">
                            {data.time.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border-2 border-black bg-white group hover:translate-x-1 transition-transform">
                                    <div>
                                        <div className="font-bold">{item.task}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold bg-gray-200 px-2 py-1 rounded-sm border border-black">{item.duration}h</span>
                                        <button onClick={() => onDelete(date, 'time', item.id)} className="text-black hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {data.time.length === 0 && <p className="text-center text-gray-400 italic">No tasks logged today.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Expense Tracking Section */}
                <Card className="shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="bg-black text-white p-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <DollarSign className="h-6 w-6" /> EXPENSE TRACKING
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="mb-6 p-4 border-2 border-black bg-gray-50">
                            <div className="text-sm font-bold text-gray-500 uppercase">Total Spent Today</div>
                            <div className="text-4xl font-black">${totalExpense.toFixed(2)}</div>
                        </div>

                        <form onSubmit={handleExpSubmit} className="flex gap-2 mb-6">
                            <Input
                                placeholder="Description"
                                value={expDesc}
                                onChange={e => setExpDesc(e.target.value)}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="$"
                                className="w-24"
                                value={expAmount}
                                onChange={e => setExpAmount(e.target.value)}
                            />
                            <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                                <Plus size={20} />
                            </Button>
                        </form>

                        <div className="space-y-3">
                            {data.expense.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border-2 border-black bg-white group hover:translate-x-1 transition-transform">
                                    <div className="font-bold">{item.description}</div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold bg-green-100 px-2 py-1 rounded-sm border border-black">${item.amount}</span>
                                        <button onClick={() => onDelete(date, 'expense', item.id)} className="text-black hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {data.expense.length === 0 && <p className="text-center text-gray-400 italic">No expenses logged today.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SummaryView({ type, entries }) {
    const now = new Date();
    const start = type === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
    const end = type === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);

    const days = eachDayOfInterval({ start, end });

    // Aggregate data
    let totalTime = 0;
    let totalMoney = 0;
    const taskSummary = {};

    days.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        const dayData = entries[dStr];
        if (dayData) {
            if (dayData.time) {
                dayData.time.forEach(t => {
                    totalTime += (t.duration || 0);
                    taskSummary[t.task] = (taskSummary[t.task] || 0) + t.duration;
                });
            }
            if (dayData.expense) {
                dayData.expense.forEach(e => {
                    totalMoney += (e.amount || 0);
                });
            }
        }
    });

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter">
                    {type === 'week' ? 'Weekly Summary' : 'Monthly Summary'}
                </h2>
                <p className="text-xl font-bold text-gray-500 mt-2">
                    {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Time Summary */}
                <Card className="shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="bg-black text-white p-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Clock className="h-6 w-6" /> TOTAL TIME: {totalTime.toFixed(1)}h
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <h3 className="font-bold border-b-2 border-black pb-2 mb-4">Breakdown by Task</h3>
                        <div className="space-y-2">
                            {Object.entries(taskSummary).length > 0 ? (
                                Object.entries(taskSummary)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([task, duration]) => (
                                        <div key={task} className="flex justify-between items-center border-b border-gray-200 py-2">
                                            <span className="font-medium">{task}</span>
                                            <span className="font-mono font-bold">{duration.toFixed(1)}h</span>
                                        </div>
                                    ))
                            ) : (
                                <p className="text-gray-400 italic">No tasks recorded this period.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Expense Summary */}
                <Card className="shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="bg-black text-white p-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <DollarSign className="h-6 w-6" /> TOTAL SPENT: ${totalMoney.toFixed(2)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="p-8 text-center border-2 border-black border-dashed bg-gray-50">
                            <div className="text-sm font-bold text-gray-500 uppercase mb-2">Total Expenses</div>
                            <div className="text-6xl font-black">${totalMoney.toFixed(2)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default App;
