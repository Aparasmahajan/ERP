'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: '🌐', color: 'bg-slate-100' },
  { id: 'education', name: 'Education', icon: '🎓', color: 'bg-blue-100' },
  { id: 'office', name: 'Office', icon: '🏢', color: 'bg-purple-100' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: 'bg-red-100' },
  { id: 'ngo', name: 'NGO', icon: '❤️', color: 'bg-green-100' },
  { id: 'retail', name: 'Retail', icon: '🛒', color: 'bg-orange-100' },
  { id: 'gym', name: 'Gym', icon: '💪', color: 'bg-yellow-100' },
  { id: 'other', name: 'Other Services', icon: '⚡', color: 'bg-indigo-100' },
];

export default function DemoPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-4 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">⬢ ERPs</h1>
          <p className="text-sm text-slate-400">Demo Portal</p>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-slate-400 mb-4 px-4">🎯 EXPLORE TEMPLATES</div>
          <p className="text-sm text-slate-300 px-4">
            Click &quot;Preview Live&quot; on any template to see a fully functional demo with sample data, roles, and features specific to that industry.
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-4">📢 Live Demo System</p>
          <Link
            href="/"
            className="block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition text-center"
          >
            ← Back to Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Template Gallery</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Demo Portal</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <TemplatesPage
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        </div>
      </main>
    </div>
  );
}

function TemplatesPage({
  selectedCategory,
  setSelectedCategory,
}: {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}) {
  const templatesByCategory = {
    education: [
      {
        id: 'student-info-system',
        icon: '🎓',
        name: 'Student Information System',
        desc: 'Complete student lifecycle management',
        features: ['Enrollment', 'Attendance Tracking', 'Grade Management', 'Parent Portal'],
      },
      {
        id: 'course-management-platform',
        icon: '📚',
        name: 'Course Management Platform',
        desc: 'Online learning & enrollment system',
        features: ['Live Classes', 'Assignments', 'Progress Tracking', 'Certifications'],
      },
    ],
    office: [
      {
        id: 'employee-management-suite',
        icon: '👔',
        name: 'Employee Management Suite',
        desc: 'Team & organization structure',
        features: ['Org Chart', 'Skills Matrix', 'Team Directory', 'Department Management'],
      },
      {
        id: 'project-management-suite',
        icon: '📊',
        name: 'Project Management Suite',
        desc: 'Tasks, timelines, and collaboration',
        features: ['Task Planning', 'Resource Allocation', 'Timeline Tracking', 'Team Collaboration'],
      },
    ],
    healthcare: [
      {
        id: 'patient-management-system',
        icon: '🏥',
        name: 'Patient Management System',
        desc: 'Medical records and scheduling',
        features: ['Patient Records', 'Appointment Scheduling', 'Medical History', 'Prescription Tracking'],
      },
    ],
    ngo: [
      {
        id: 'volunteer-management-portal',
        icon: '❤️',
        name: 'Volunteer Management Portal',
        desc: 'Manage volunteers and campaigns',
        features: ['Volunteer Tracking', 'Event Management', 'Hours Logging', 'Impact Reports'],
      },
    ],
    retail: [
      {
        id: 'retail-operations-hub',
        icon: '🏪',
        name: 'Retail Operations Hub',
        desc: 'Inventory and multi-location support',
        features: ['Inventory Mgmt', 'Multi-Store Sync', 'Stock Alerts', 'Supplier Management'],
      },
    ],
    gym: [
      {
        id: 'fitness-center-management',
        icon: '💪',
        name: 'Fitness Center Management',
        desc: 'Classes, trainers, and billing',
        features: ['Member Registry', 'Class Scheduling', 'Billing System', 'Trainer Profiles'],
      },
    ],
    other: [
      {
        id: 'logistics-fleet-management',
        icon: '🚚',
        name: 'Logistics Fleet Management',
        desc: 'Fleet and delivery management',
        features: ['Fleet Tracking', 'Route Optimization', 'Delivery Status', 'Driver Management'],
      },
    ],
  };

  const displayTemplates =
    selectedCategory === 'all'
      ? Object.values(templatesByCategory).flat()
      : templatesByCategory[selectedCategory as keyof typeof templatesByCategory] || [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Gallery</h1>
      <p className="text-slate-600 mb-8">Choose a template to see it in action</p>

      {/* Category Filters */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-3 border-b border-slate-200">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap border-b-2 ${
              selectedCategory === cat.id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {displayTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-xl transition"
          >
            {/* Icon Header */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-100 h-32 flex items-center justify-center text-6xl">
              {template.icon}
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{template.name}</h3>
              <p className="text-slate-600 text-sm mb-4">{template.desc}</p>

              {/* Features */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Key Features:</p>
                <ul className="space-y-1">
                  {template.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="text-blue-600">✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <a
                  href={`/demo/${template.id}`}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm block text-center"
                >
                  👀 Preview Live
                </a>
                <button className="w-full py-2 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition text-sm">
                  📋 View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">No templates in this category yet</p>
        </div>
      )}
    </div>
  );
}

function NavLink({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded transition ${
        active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
