import React, { useState, useEffect } from 'react';
import { format, parse, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { Clock, DollarSign, Plus, Check, X, Edit2, Trash2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Helper: Smart Time Parser
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

export default function DayDetailView({ date, data, onSave, onDelete, isToday, savedOptions, onSaveOption }) {
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

    // SORTING LOGIC: Earliest time first
    const sortedTimeEntries = [...data.time].sort((a, b) => {
        const tA = a.startTime || '00:00';
        const tB = b.startTime || '00:00';
        return tA.localeCompare(tB);
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                    {format(parseISO(date), 'EEEE')}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    {!isToday && <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">Archive</span>}
                    <p className="text-xl text-zinc-500">{format(parseISO(date), 'MMMM do, yyyy')}</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Expense Tracking (First) */}
                <Card className="order-1">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 flex flex-row items-center justify-between space-y-0 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2 text-lg font-medium">
                            <DollarSign className="h-5 w-5 text-zinc-400" /> Expenses
                        </CardTitle>
                        <div className="text-sm font-medium bg-zinc-950 border border-zinc-800 px-3 py-1 rounded text-zinc-100">
                            ${totalExpense.toFixed(2)}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleExpSubmit} className={`flex flex-col gap-3 mb-6 p-4 rounded-lg border border-dashed ${editingExpId ? 'border-yellow-600/50 bg-yellow-900/5' : 'border-zinc-800 bg-zinc-900/20'}`}>
                            {editingExpId && <div className="text-xs font-medium text-yellow-500 uppercase">Editing Entry</div>}
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-grow">
                                    <Input
                                        list="expense-options"
                                        placeholder="Description"
                                        value={expDesc}
                                        onChange={e => setExpDesc(e.target.value)}
                                    />
                                    <datalist id="expense-options">
                                        {savedOptions.expense.map((opt, i) => <option key={i} value={opt} />)}
                                    </datalist>
                                </div>
                                <Button type="button" onClick={() => onSaveOption('expense', expDesc)} className="px-2 border-zinc-800 text-zinc-400 hover:text-white" title="Save as default">
                                    <Bookmark size={18} />
                                </Button>
                                <Input
                                    type="number" step="0.01" placeholder="$"
                                    className="w-24"
                                    value={expAmount}
                                    onChange={e => setExpAmount(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                {editingExpId && (
                                    <Button type="button" onClick={cancelEditExp} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/10">
                                        <X size={18} /> Cancel
                                    </Button>
                                )}
                                <Button type="submit" className={`flex-grow ${editingExpId ? 'bg-yellow-600 text-white border-transparent hover:bg-yellow-500' : 'bg-white text-black border-transparent hover:bg-zinc-200'}`}>
                                    {editingExpId ? <><Check size={18} className="mr-2" /> Update</> : <><Plus size={18} className="mr-2" /> Add Expense</>}
                                </Button>
                            </div>
                        </form>

                        <div className="space-y-2">
                            {data.expense.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 rounded-md bg-zinc-900/50 border border-zinc-800 group hover:border-zinc-600 transition-colors">
                                    <div className="font-medium text-zinc-200">{item.description}</div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm text-green-400">${item.amount}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditExp(item)} className="text-zinc-500 hover:text-zinc-100 p-1"><Edit2 size={14} /></button>
                                            <button onClick={() => onDelete(date, 'expense', item.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {data.expense.length === 0 && <p className="text-center text-zinc-600 italic text-sm py-4">No expenses logged.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Time Tracking (Second) */}
                <Card className="order-2">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 flex flex-row items-center justify-between space-y-0 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2 text-lg font-medium">
                            <Clock className="h-5 w-5 text-zinc-400" /> Time Log
                        </CardTitle>
                        <div className="text-sm font-medium bg-zinc-950 border border-zinc-800 px-3 py-1 rounded text-zinc-100">
                            {totalHours.toFixed(2)}h
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleTimeSubmit} className={`flex flex-col gap-3 mb-6 p-4 rounded-lg border border-dashed ${editingTimeId ? 'border-yellow-600/50 bg-yellow-900/5' : 'border-zinc-800 bg-zinc-900/20'}`}>
                            {editingTimeId && <div className="text-xs font-medium text-yellow-500 uppercase mb-1">Editing Entry</div>}
                            <div className="flex gap-2 items-center">
                                <div className="flex-grow">
                                    <Input
                                        list="time-options"
                                        placeholder="Task description..."
                                        value={timeTask}
                                        onChange={e => setTimeTask(e.target.value)}
                                    />
                                    <datalist id="time-options">
                                        {savedOptions.time.map((opt, i) => <option key={i} value={opt} />)}
                                    </datalist>
                                </div>
                                <Button type="button" onClick={() => onSaveOption('time', timeTask)} className="px-2 border-zinc-800 text-zinc-400 hover:text-white" title="Save as default">
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
                                    />
                                </div>
                                <Button type="button" onClick={() => setShowPickers(!showPickers)} className="px-3 border-zinc-800 text-zinc-400 hover:text-white" title="Toggle Manual Time Picker">
                                    <Clock size={16} />
                                </Button>
                            </div>

                            {showPickers && (
                                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                    <span className="self-center text-zinc-500">-</span>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                {editingTimeId && (
                                    <Button type="button" onClick={cancelEditTime} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/10">
                                        <X size={18} /> Cancel
                                    </Button>
                                )}
                                <Button type="submit" className={`flex-grow ${editingTimeId ? 'bg-yellow-600 text-white border-transparent hover:bg-yellow-500' : 'bg-white text-black border-transparent hover:bg-zinc-200'}`}>
                                    {editingTimeId ? <><Check size={18} className="mr-2" /> Update</> : <><Plus size={18} className="mr-2" /> Add Entry</>}
                                </Button>
                            </div>
                        </form>

                        <div className="space-y-2">
                            {sortedTimeEntries.map(item => (
                                <div key={item.id} className="relative flex justify-between items-center p-3 rounded-md bg-zinc-900/50 border border-zinc-800 group hover:border-zinc-600 transition-colors">
                                    <div>
                                        <div className="font-medium text-zinc-200">{item.task}</div>
                                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{item.startTime} - {item.endTime}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-medium text-zinc-300">{item.duration}h</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditTime(item)} className="text-zinc-500 hover:text-zinc-100 p-1"><Edit2 size={14} /></button>
                                            <button onClick={() => onDelete(date, 'time', item.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {data.time.length === 0 && <p className="text-center text-zinc-600 italic text-sm py-4">No tasks logged.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
