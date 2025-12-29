
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
}

type GroupByField = 'category' | 'subCategory' | 'vendor';

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [reportType, setReportType] = useState<'income' | 'expense'>('expense');
  const [groupBy, setGroupBy] = useState<GroupByField>('category');

  const aggregationData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === (reportType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE))
      .forEach(t => {
        const key = t[groupBy] || 'Unspecified';
        data[key] = (data[key] || 0) + t.amount;
      });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, reportType, groupBy]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

  const groupByLabels: Record<GroupByField, string> = {
    category: 'Category',
    subCategory: 'Sub-Category',
    vendor: 'Vendor'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Financial Analysis</h2>
            <p className="text-sm text-gray-500">Grouped by {groupByLabels[groupBy]}</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setGroupBy('category')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  groupBy === 'category' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Category
              </button>
              <button
                onClick={() => setGroupBy('subCategory')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  groupBy === 'subCategory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Sub-Cat
              </button>
              <button
                onClick={() => setGroupBy('vendor')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  groupBy === 'vendor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Vendor
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setReportType('expense')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  reportType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setReportType('income')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  reportType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Income
              </button>
            </div>
          </div>
        </div>

        <div className="h-[500px] w-full">
          {aggregationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregationData}
                layout="vertical"
                margin={{ left: 100, right: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100} 
                  tick={{ fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                  {aggregationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No data available for the selected group.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Top 5 {groupByLabels[groupBy]}s</h3>
          <div className="space-y-4">
            {aggregationData.slice(0, 5).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-sm font-medium text-gray-600 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">${item.value.toLocaleString()}</span>
              </div>
            ))}
            {aggregationData.length === 0 && <p className="text-sm text-gray-400 italic">No data</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Summary Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-500">Group Count</span>
              <span className="text-sm font-bold">{aggregationData.length}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-500">Average per {groupByLabels[groupBy]}</span>
              <span className="text-sm font-bold">
                ${aggregationData.length > 0 
                  ? (aggregationData.reduce((acc, curr) => acc + curr.value, 0) / aggregationData.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                  : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Highest Individual</span>
              <span className="text-sm font-bold text-blue-600">
                ${aggregationData.length > 0 ? aggregationData[0].value.toLocaleString() : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
