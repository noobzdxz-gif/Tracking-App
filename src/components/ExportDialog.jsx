import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { Download, FileDown, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ExportDialog({ entries, onClose }) {
    const [mode, setMode] = useState('month'); // 'month', 'year', 'custom'
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const generateCSV = () => {
        let start, end;

        if (mode === 'month') {
            const date = new Date(selectedMonth);
            start = startOfMonth(date);
            end = endOfMonth(date);
        } else if (mode === 'year') {
            const date = new Date(selectedYear, 0, 1);
            start = startOfYear(date);
            end = endOfYear(date);
        } else {
            if (!customStart || !customEnd) return alert("Please select start and end dates");
            start = new Date(customStart);
            end = new Date(customEnd);
        }

        const interval = { start, end };
        const rows = [['Date', 'Type', 'Category/Task', 'Value (Amount/Hours)', 'Start Time', 'End Time']];

        // Loop through all dates in range
        const days = eachDayOfInterval(interval);

        days.forEach(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const dayData = entries[dStr];

            if (dayData) {
                // Time Entries
                dayData.time.forEach(t => {
                    rows.push([
                        dStr,
                        'Time',
                        `"${t.task.replace(/"/g, '""')}"`, // Escape quotes
                        t.duration,
                        t.startTime || '',
                        t.endTime || ''
                    ]);
                });

                // Expense Entries
                dayData.expense.forEach(e => {
                    rows.push([
                        dStr,
                        'Expense',
                        `"${e.description.replace(/"/g, '""')}"`, // Escape quotes
                        e.amount,
                        '',
                        ''
                    ]);
                });
            }
        });

        if (rows.length === 1) {
            return alert("No data found for this period.");
        }

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tracker_export_${format(start, 'yyyyMMdd')}-${format(end, 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 py-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <FileDown className="text-zinc-400" /> Export Data
                    </CardTitle>
                    <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                        <X size={20} />
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="flex bg-zinc-900 p-1 rounded-md">
                        {['month', 'year', 'custom'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 text-sm font-medium py-1.5 rounded-sm capitalize transition-colors ${mode === m ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {mode === 'month' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Select Month</label>
                                <Input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>
                        )}

                        {mode === 'year' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Select Year</label>
                                <Input
                                    type="number"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    min="2000" max="2100"
                                />
                            </div>
                        )}

                        {mode === 'custom' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Start Date</label>
                                    <Input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">End Date</label>
                                    <Input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <Button onClick={generateCSV} className="w-full bg-white text-black hover:bg-zinc-200">
                        <Download className="mr-2 h-4 w-4" /> Download CSV
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
