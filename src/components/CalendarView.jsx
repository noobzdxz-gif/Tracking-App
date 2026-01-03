import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarView({ entries, onSelectDate }) {
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
                <Button variant="ghost" onClick={prevMonth} className="px-3 text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900"><ChevronLeft size={24} /></Button>
                <div className="text-center"><h2 className="text-3xl font-semibold tracking-tight text-white">{format(currentMonth, "MMMM yyyy")}</h2></div>
                <Button variant="ghost" onClick={nextMonth} className="px-3 text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900"><ChevronRight size={24} /></Button>
            </div>
            <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-medium text-zinc-500 uppercase text-xs border-b border-zinc-800 pb-2">{day}</div>
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
                            className={`min-h-[80px] md:min-h-[120px] p-2 border cursor-pointer transition-all rounded-md
                                ${isSelectedMonth ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-600' : 'bg-zinc-950/20 border-zinc-900 opacity-40'}
                                ${isSameDay(day, new Date()) ? 'ring-1 ring-white' : ''}
                            `}>
                            <div className="flex justify-between items-start">
                                <span className={`font-medium text-sm ${!isSelectedMonth ? 'text-zinc-600' : 'text-zinc-400'}`}>{format(day, 'd')}</span>
                                {hasData && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
                            </div>
                            {hasData && isSelectedMonth && (
                                <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1 text-[10px] md:text-xs">
                                    {dayData.time.length > 0 && <div className="flex items-center gap-1 text-zinc-400"><Clock size={8} className="md:w-[10px] md:h-[10px]" /> <span className="truncate">{dayData.time.reduce((acc, t) => acc + t.duration, 0).toFixed(1)}h</span></div>}
                                    {dayData.expense.length > 0 && <div className="flex items-center gap-1 text-green-500/80"><DollarSign size={8} className="md:w-[10px] md:h-[10px]" /> <span className="truncate">${dayData.expense.reduce((acc, e) => acc + e.amount, 0).toFixed(0)}</span></div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
