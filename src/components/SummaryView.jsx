import React from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Clock, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SummaryView({ type, entries }) {
    const now = new Date();
    const start = type === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
    const end = type === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    let totalTime = 0;
    let totalMoney = 0;
    const expenseSummary = {};

    days.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        const dayData = entries[dStr];
        if (dayData) {
            if (dayData.time) dayData.time.forEach(t => { totalTime += (t.duration || 0); taskSummary[t.task] = (taskSummary[t.task] || 0) + t.duration; });
            if (dayData.expense) dayData.expense.forEach(e => {
                totalMoney += (e.amount || 0);
                expenseSummary[e.description] = (expenseSummary[e.description] || 0) + e.amount;
            });
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-white">{type === 'week' ? 'Weekly Summary' : 'Monthly Summary'}</h2>
                <p className="text-lg text-zinc-500 mt-2">{format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}</p>
            </div>

            <div className="flex flex-col gap-6">
                {/* Expense Summary (Top) */}
                <Card className="order-1">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 text-white rounded-t-lg"><CardTitle className="text-lg flex items-center gap-2 font-medium"><DollarSign className="h-5 w-5 text-zinc-400" /> Total Spent: ${totalMoney.toFixed(2)}</CardTitle></CardHeader>
                    <CardContent className="p-6 text-white">
                        <div className="p-8 text-center border border-zinc-800 border-dashed bg-zinc-900/30 rounded-lg mb-6">
                            <div className="text-sm font-medium text-zinc-500 uppercase mb-2">Total Expenses</div>
                            <div className="text-5xl font-bold tracking-tight">${totalMoney.toFixed(2)}</div>
                        </div>

                        <h3 className="font-semibold border-b border-zinc-800 pb-2 mb-4 text-zinc-200">Expense Breakdown</h3>
                        <div className="space-y-2">
                            {Object.entries(expenseSummary).length > 0 ? (
                                Object.entries(expenseSummary).sort(([, a], [, b]) => b - a).map(([desc, amount]) => (
                                    <div key={desc} className="flex justify-between items-center border-b border-zinc-900 py-2 last:border-0">
                                        <span className="font-medium text-zinc-300">{desc}</span>
                                        <span className="font-mono font-medium text-zinc-500">${amount.toFixed(2)}</span>
                                    </div>
                                ))
                            ) : <p className="text-zinc-600 italic">No expenses recorded.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Time Summary (Bottom) */}
                <Card className="order-2">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 text-white rounded-t-lg"><CardTitle className="text-lg flex items-center gap-2 font-medium"><Clock className="h-5 w-5 text-zinc-400" /> Total Time: {totalTime.toFixed(1)}h</CardTitle></CardHeader>
                    <CardContent className="p-6 text-white">
                        <h3 className="font-semibold border-b border-zinc-800 pb-2 mb-4 text-zinc-200">Task Breakdown</h3>
                        <div className="space-y-2">
                            {Object.entries(taskSummary).length > 0 ? (
                                Object.entries(taskSummary).sort(([, a], [, b]) => b - a).map(([task, duration]) => (
                                    <div key={task} className="flex justify-between items-center border-b border-zinc-900 py-2 last:border-0">
                                        <span className="font-medium text-zinc-300">{task}</span>
                                        <span className="font-mono font-medium text-zinc-500">{duration.toFixed(1)}h</span>
                                    </div>
                                ))
                            ) : <p className="text-zinc-600 italic">No tasks recorded.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
