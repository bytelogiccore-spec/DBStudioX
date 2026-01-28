'use client';

import React, { useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { usePerformanceStore } from '@/stores/performanceStore';
import { Activity, Zap, HardDrive, Cpu } from 'lucide-react';
import styles from './PerformanceDashboard.module.css';

const PerformanceDashboard: React.FC = () => {
    const { history, currentMetrics, startMonitoring } = usePerformanceStore();

    useEffect(() => {
        startMonitoring();
    }, [startMonitoring]);

    const chartData = history.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
        queryTime: h.metrics.avgQueryTimeMs,
        cacheHit: h.metrics.cacheHitRate * 100,
        memory: h.metrics.memoryUsageBytes / 1024 / 1024,
    }));

    return (
        <div className={styles.container}>
            {/* Metrics Grid */}
            <div className={styles.metricsGrid}>
                <MetricCard
                    icon={<Zap size={20} />}
                    iconColor="var(--brand-primary)"
                    label="Avg Query Time"
                    value={`${currentMetrics?.avgQueryTimeMs.toFixed(2) || 0}ms`}
                    trend="Real-time"
                />
                <MetricCard
                    icon={<Activity size={20} />}
                    iconColor="var(--brand-success)"
                    label="Cache Hit Rate"
                    value={`${((currentMetrics?.cacheHitRate || 0) * 100).toFixed(1)}%`}
                    trend="Optimal"
                />
                <MetricCard
                    icon={<HardDrive size={20} />}
                    iconColor="var(--brand-secondary)"
                    label="Total Queries"
                    value={currentMetrics?.queryCount.toString() || '0'}
                    trend="Cumulative"
                />
                <MetricCard
                    icon={<Cpu size={20} />}
                    iconColor="var(--brand-warning)"
                    label="Memory Usage"
                    value={`${((currentMetrics?.memoryUsageBytes || 0) / 1024 / 1024).toFixed(1)}MB`}
                    trend="Managed"
                />
            </div>

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
                {/* Query Latency Chart */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Query Latency (ms)</h3>
                        <span className={styles.chartBadge}>Auto-updating</span>
                    </div>
                    <div className={styles.chartBody}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#5c6370"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="#5c6370"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}ms`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                                    itemStyle={{ color: 'var(--brand-primary)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="queryTime"
                                    stroke="var(--brand-primary)"
                                    fillOpacity={1}
                                    fill="url(#latencyGradient)"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cache Performance Chart */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Cache Hit Rate (%)</h3>
                        <span className={styles.chartBadge}>Last 50 Samples</span>
                    </div>
                    <div className={styles.chartBody}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#5c6370"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="#5c6370"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                                    itemStyle={{ color: 'var(--brand-success)' }}
                                />
                                <Line
                                    type="stepAfter"
                                    dataKey="cacheHit"
                                    stroke="var(--brand-success)"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    icon: React.ReactNode;
    iconColor: string;
    label: string;
    value: string;
    trend: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, iconColor, label, value, trend }) => (
    <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
            <div className={styles.metricIcon} style={{ color: iconColor }}>{icon}</div>
            <span className={styles.metricTrend}>{trend}</span>
        </div>
        <div className={styles.metricBody}>
            <p className={styles.metricLabel}>{label}</p>
            <h4 className={styles.metricValue}>{value}</h4>
        </div>
    </div>
);

export default PerformanceDashboard;
