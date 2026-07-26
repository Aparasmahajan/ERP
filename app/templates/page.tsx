'use client';

import { useState, useMemo } from 'react';

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  type: string;
  features: string[];
  featured?: boolean;
  demoId?: string;
}

const DEMO_TEMPLATE_MAP: { [key: string]: string } = {
  institution: 'student-info-system',
  organization: 'employee-management-suite',
  hospital: 'patient-management-system',
  ngo: 'volunteer-management-portal',
  'online-academy': 'course-management-platform',
  startup: 'project-management-suite',
  fitness: 'fitness-center-management',
  retail: 'retail-operations-hub',
  logistics: 'logistics-fleet-management',
};

// ALL TEMPLATES
const ALL_TEMPLATES: Template[] = [
  {
    id: 'institution',
    name: 'School / College',
    icon: '🎓',
    type: 'Education',
    description: 'Perfect for schools, colleges, and universities',
    color: 'from-blue-500 to-blue-600',
    featured: true,
    features: ['Student & Staff', 'Attendance', 'Leave', 'Marks', 'Assignments', 'Timetable', 'Fees', 'Guardian Portal'],
  },
  {
    id: 'organization',
    name: 'Corporate Office',
    icon: '🏢',
    type: 'Business',
    description: 'Ideal for offices, companies, and enterprises',
    color: 'from-purple-500 to-purple-600',
    featured: true,
    features: ['Employee Mgmt', 'Attendance', 'Leave', 'Payroll', 'Performance', 'Projects', 'Timesheet', 'Hiring'],
  },
  {
    id: 'hospital',
    name: 'Hospital / Clinic',
    icon: '🏥',
    type: 'Healthcare',
    description: 'Designed for hospitals, clinics, and medical centers',
    color: 'from-red-500 to-red-600',
    featured: true,
    features: ['Patient Records', 'Staff Scheduling', 'Departments', 'Doctors', 'Appointments', 'Medical Records', 'Billing', 'Compliance'],
  },
  {
    id: 'ngo',
    name: 'NGO / Charity',
    icon: '❤️',
    type: 'Non-Profit',
    description: 'Tailored for NGOs, charities, and social enterprises',
    color: 'from-green-500 to-green-600',
    featured: true,
    features: ['Volunteers', 'Donors', 'Campaigns', 'Events', 'Beneficiaries', 'Funds', 'Impact', 'Grants'],
  },
  {
    id: 'online-academy',
    name: 'Online Academy',
    icon: '💻',
    type: 'Education',
    description: 'For e-learning platforms and online courses',
    color: 'from-cyan-500 to-blue-500',
    features: ['Courses', 'Enrollment', 'Live Classes', 'Assignments', 'Progress', 'Certificates', 'Payments', 'Forum'],
  },
  {
    id: 'startup',
    name: 'Startup',
    icon: '🚀',
    type: 'Business',
    description: 'Built for growing startups and tech teams',
    color: 'from-pink-500 to-purple-500',
    features: ['Teams', 'Projects', 'Tasks', 'Sprints', 'Time Tracking', 'Approvals', 'Budget', 'Communication'],
  },
  {
    id: 'fitness',
    name: 'Fitness Center',
    icon: '💪',
    type: 'Healthcare',
    description: 'For gyms, wellness centers, and fitness studios',
    color: 'from-orange-500 to-red-500',
    features: ['Members', 'Classes', 'Trainers', 'Billing', 'Attendance', 'Progress', 'Equipment', 'Notifications'],
  },
  {
    id: 'community',
    name: 'Community Center',
    icon: '🤝',
    type: 'Non-Profit',
    description: 'For community groups and social organizations',
    color: 'from-emerald-500 to-green-600',
    features: ['Members', 'Events', 'Volunteers', 'Attendance', 'Donations', 'Resources', 'Communication', 'Logging'],
  },
  {
    id: 'retail',
    name: 'Retail Chain',
    icon: '🛒',
    type: 'Retail',
    description: 'Built for stores, franchises, and retail networks',
    color: 'from-orange-500 to-orange-600',
    features: ['Stores', 'Inventory', 'Sales', 'Staff', 'Loyalty', 'POS', 'Suppliers', 'Multi-location'],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    icon: '🛍️',
    type: 'Retail',
    description: 'For online stores and digital marketplaces',
    color: 'from-yellow-500 to-orange-500',
    features: ['Catalog', 'Orders', 'Inventory', 'Payments', 'Shipping', 'Reviews', 'Marketing', 'Analytics'],
  },
  {
    id: 'logistics',
    name: 'Logistics Company',
    icon: '🚚',
    type: 'Logistics',
    description: 'Optimized for transportation and logistics operations',
    color: 'from-yellow-500 to-yellow-600',
    features: ['Fleet', 'Routes', 'Drivers', 'Delivery', 'Maintenance', 'Fuel', 'Shipments', 'Analytics'],
  },
  {
    id: 'taxi',
    name: 'Taxi / Cab Service',
    icon: '🚕',
    type: 'Logistics',
    description: 'For ride-sharing and taxi services',
    color: 'from-yellow-400 to-yellow-600',
    features: ['Drivers', 'Vehicles', 'Rides', 'Fares', 'Bookings', 'Tracking', 'Ratings', 'Earnings'],
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🌐' },
  { id: 'education', name: 'Education', icon: '🎓' },
  { id: 'business', name: 'Business', icon: '🏢' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'nonprofit', name: 'Non-Profit', icon: '❤️' },
  { id: 'retail', name: 'Retail', icon: '🛒' },
  { id: 'logistics', name: 'Logistics', icon: '🚚' },
];

const CATEGORY_MAP: { [key: string]: string[] } = {
  education: ['Education'],
  business: ['Business'],
  healthcare: ['Healthcare'],
  nonprofit: ['Non-Profit'],
  retail: ['Retail'],
  logistics: ['Logistics'],
};

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [primaryColor] = useState('#2563eb');

  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || CATEGORY_MAP[selectedCategory]?.includes(t.type);

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowEnquiry(true);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <a href="/" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
                ← Back to Home
              </a>
              <h1 className="text-4xl font-bold text-slate-900 mt-2">All Templates</h1>
              <p className="text-slate-600 mt-1">{ALL_TEMPLATES.length} solutions ready to deploy</p>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, type, or features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-4"
          />

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-slate-600 mb-2">No templates found</p>
            <p className="text-slate-500">Try adjusting your search: "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600">
              Showing {filteredTemplates.length} of {ALL_TEMPLATES.length} templates
              {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}`}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-lg overflow-hidden border border-slate-200 hover:shadow-xl transition bg-white"
                >
                  <div className={`bg-gradient-to-r ${template.color} h-40 flex items-center justify-center text-6xl`}>
                    {template.icon}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                        {template.type}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4">{template.description}</p>

                    {/* Features */}
                    <ul className="space-y-1 mb-6">
                      {template.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                          <span style={{ color: primaryColor }}>✓</span> {feature}
                        </li>
                      ))}
                      {template.features.length > 4 && (
                        <li className="text-xs text-slate-600">+ {template.features.length - 4} more</li>
                      )}
                    </ul>

                    {/* Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full py-2 rounded-lg font-semibold text-white transition text-sm cursor-pointer"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Choose & Enquire →
                      </button>
                      {DEMO_TEMPLATE_MAP[template.id] ? (
                        <a
                          href={`/demo/${DEMO_TEMPLATE_MAP[template.id]}`}
                          className="w-full py-2 rounded-lg font-semibold transition text-sm block text-center border-2 cursor-pointer"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          👀 Preview Demo
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 rounded-lg font-semibold transition text-sm block text-center border-2 cursor-not-allowed opacity-50"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Enquiry Modal */}
      {showEnquiry && selectedTemplate && (
        <EnquiryModal
          template={selectedTemplate}
          primaryColor={primaryColor}
          onClose={() => {
            setShowEnquiry(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </main>
  );
}

function EnquiryModal({ template, primaryColor, onClose }: { template: Template; primaryColor: string; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Enquiry:', { template: template.id, ...formData });
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-8">
        {!submitted ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Send Enquiry</h2>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-2xl">
                ×
              </button>
            </div>

            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}20`, borderLeft: `4px solid ${primaryColor}` }}>
              <p className="text-sm text-slate-600 mb-2">Selected Template:</p>
              <p className="font-semibold text-slate-900">
                {template.icon} {template.name}
              </p>
              <p className="text-xs text-slate-600 mt-1">{template.type}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <input
                type="text"
                placeholder="Organization Name"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <textarea
                placeholder="Tell us more about your needs..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                className="w-full py-3 text-white rounded-lg font-semibold transition hover:shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Submit Enquiry
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h3>
            <p className="text-slate-600">We've received your enquiry. We'll be in touch soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
