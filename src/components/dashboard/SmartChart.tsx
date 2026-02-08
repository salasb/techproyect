"use client";

import { useState } from "react";
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
    BarChart3,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    Download,
    Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SmartChartProps {
    title: string;
    data: any[];
    dataKey: string;
    categoryKey: string;
    defaultType?: 'bar' | 'line' | 'area' | 'pie';
    onDrillDown?: (data: any) => void;
    color?: string;
    height?: number;
}

export function SmartChart({
    title,
    data,
    dataKey,
    categoryKey,
    defaultType = 'bar',
    onDrillDown,
    color = "#6A67CE", // Primary Purple
    height = 300
}: SmartChartProps) {
    const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>(defaultType);

    const COLORS = ['#6A67CE', '#00CA72', '#F59E0B', '#EF4444', '#3B82F6'];

    const renderChart = () => {
        const commonProps = {
            data,
            margin: { top: 10, right: 30, left: 0, bottom: 0 },
            onClick: (state: any) => {
                if (state && state.activePayload && onDrillDown) {
                    onDrillDown(state.activePayload[0].payload);
                }
            }
        };

        switch (chartType) {
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
                        <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
                        <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.2} />
                    </AreaChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey={dataKey}
                            nameKey={categoryKey}
                            onClick={(_, index) => {
                                if (onDrillDown) onDrillDown(data[index]);
                            }}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                );
            case 'bar':
            default:
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
                        <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                        />
                        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-full w-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", chartType === 'bar' && "bg-background shadow-sm text-primary")}
                        onClick={() => setChartType('bar')}
                        title="Bar Chart"
                    >
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", chartType === 'line' && "bg-background shadow-sm text-primary")}
                        onClick={() => setChartType('line')}
                        title="Line Chart"
                    >
                        <LineChartIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", chartType === 'pie' && "bg-background shadow-sm text-primary")}
                        onClick={() => setChartType('pie')}
                        title="Pie Chart"
                    >
                        <PieChartIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="w-full flex-1 min-h-[300px]" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {onDrillDown && (
                <p className="text-xs text-muted-foreground mt-4 text-center italic">
                    Click on a data point to see details
                </p>
            )}
        </div>
    );
}
