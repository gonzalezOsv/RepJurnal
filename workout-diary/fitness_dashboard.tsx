import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, AlertTriangle, Target, Activity, Award, Calendar } from 'lucide-react';

const FitnessDashboard = () => {
  const [timeRange, setTimeRange] = useState('30days');
  
  // Sample data - replace with your database queries
  const volumeByMuscle = [
    { muscle: 'Chest', volume: 45000, lastWeek: 42000, target: 50000 },
    { muscle: 'Back', volume: 38000, lastWeek: 35000, target: 45000 },
    { muscle: 'Shoulders', volume: 28000, lastWeek: 26000, target: 35000 },
    { muscle: 'Arms', volume: 32000, lastWeek: 30000, target: 35000 },
    { muscle: 'Legs', volume: 52000, lastWeek: 48000, target: 55000 },
    { muscle: 'Core', volume: 15000, lastWeek: 14000, target: 20000 },
  ];

  const muscleBalance = [
    { category: 'Chest', value: 85 },
    { category: 'Back', value: 78 },
    { category: 'Shoulders', value: 65 },
    { category: 'Arms', value: 75 },
    { category: 'Legs', value: 92 },
    { category: 'Core', value: 58 },
  ];

  const pushPullData = [
    { name: 'Push', value: 58, color: '#3b82f6' },
    { name: 'Pull', value: 42, color: '#10b981' },
  ];

  const volumeProgression = [
    { week: 'W1', chest: 38000, back: 32000, legs: 45000 },
    { week: 'W2', chest: 40000, back: 34000, legs: 47000 },
    { week: 'W3', chest: 42000, back: 35000, legs: 48000 },
    { week: 'W4', chest: 45000, back: 38000, legs: 52000 },
  ];

  const weakPoints = [
    { muscle: 'Core', deficit: -42, status: 'critical' },
    { muscle: 'Shoulders', deficit: -35, status: 'warning' },
    { muscle: 'Back', deficit: -22, status: 'warning' },
  ];

  const kpis = [
    { 
      title: 'Total Volume (30d)', 
      value: '210,000 kg', 
      change: '+12%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    { 
      title: 'Muscle Balance Score', 
      value: '75/100', 
      change: '+5',
      trend: 'up',
      icon: Target,
      color: 'text-blue-600'
    },
    { 
      title: 'Training Frequency', 
      value: '4.5x/week', 
      change: 'Optimal',
      trend: 'neutral',
      icon: Calendar,
      color: 'text-purple-600'
    },
    { 
      title: 'Weak Points', 
      value: '3 areas', 
      change: 'Needs attention',
      trend: 'down',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
  ];

  const recentPRs = [
    { exercise: 'Bench Press', weight: '225 lbs', date: '2 days ago', muscles: 'Chest, Triceps' },
    { exercise: 'Deadlift', weight: '405 lbs', date: '5 days ago', muscles: 'Back, Legs' },
    { exercise: 'Squat', weight: '315 lbs', date: '1 week ago', muscles: 'Legs, Core' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Analytics</h1>
            <p className="text-gray-600 mt-1">Track your muscle development and optimize your gains</p>
          </div>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                  <p className={`text-sm mt-1 ${kpi.color}`}>{kpi.change}</p>
                </div>
                <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Volume by Muscle Group */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Volume by Muscle Group</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeByMuscle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="muscle" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="volume" fill="#3b82f6" name="Current Volume" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Muscle Balance Radar */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Muscle Balance Score</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={muscleBalance}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Development" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Volume Progression */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Volume Progression (4 Weeks)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={volumeProgression}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="chest" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="back" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="legs" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Push/Pull Ratio */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Push/Pull Balance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pushPullData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pushPullData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-sm text-orange-600 font-medium">⚠️ Push bias detected</p>
              <p className="text-xs text-gray-600 mt-1">Add 2 more pull exercises this week</p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Weak Points Alert */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Weak Points Analysis</h2>
            </div>
            <div className="space-y-3">
              {weakPoints.map((point, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{point.muscle}</p>
                    <p className="text-sm text-gray-600">{Math.abs(point.deficit)}% below optimal volume</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    point.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {point.status === 'critical' ? 'Critical' : 'Warning'}
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Generate Corrective Workout Plan
            </button>
          </div>

          {/* Recent PRs */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Personal Records</h2>
            </div>
            <div className="space-y-3">
              {recentPRs.map((pr, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{pr.exercise}</p>
                      <p className="text-sm text-gray-600">{pr.muscles}</p>
                    </div>
                    <span className="text-lg font-bold text-green-600">{pr.weight}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pr.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-3">📊 AI-Powered Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <p className="font-semibold mb-1">🎯 This Week's Focus</p>
              <p className="text-sm">Add 3 core exercises to hit 20k volume target</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <p className="font-semibold mb-1">⚡ Progressive Overload</p>
              <p className="text-sm">Increase bench press by 5 lbs next session</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <p className="font-semibold mb-1">🔄 Recovery Status</p>
              <p className="text-sm">Chest fully recovered, back needs 1 more day</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FitnessDashboard;