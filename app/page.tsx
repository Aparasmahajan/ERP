'use client';

import { useState } from 'react';

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

// ALL TEMPLATES (configurable via admin panel + Excel)
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

export default function Home() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#7c3aed');

  const featuredTemplates = ALL_TEMPLATES.filter((t) => t.featured);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowEnquiry(true);
  };

  return (
    <main className="min-h-screen" style={{ '--primary-color': primaryColor, '--secondary-color': secondaryColor } as any}>
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 z-50 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold" style={{ color: primaryColor }}>
            ⬢ ERP
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPrimaryColor(primaryColor === '#2563eb' ? '#dc2626' : '#2563eb')}
              className="text-sm px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
            >
              🎨 Colors
            </button>
            <a
              href="/setup"
              className="px-6 py-2 text-white rounded-lg font-semibold transition"
              style={{ backgroundColor: primaryColor }}
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6" style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)` }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-2 rounded-full font-medium text-sm mb-6" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
            🚀 Enterprise ERP • Multi-Tenant • Instant Setup
          </div>
          <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Choose Your ERP <span style={{ color: primaryColor }}>Solution</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Select from our pre-built templates or browse all options. Get started in minutes with your custom setup.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#featured"
              className="px-8 py-3 rounded-lg font-semibold text-white transition"
              style={{ backgroundColor: primaryColor }}
            >
              Choose Template
            </a>
            <a
              href="/demo"
              className="px-8 py-3 border-2 rounded-lg font-semibold transition"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              👀 Preview Demo
            </a>
          </div>
        </div>
      </section>

      {/* Featured Templates */}
      <section id="featured" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 text-center">Featured Solutions</h2>
          <p className="text-center text-slate-600 mb-12">Choose from our most popular templates or browse all options</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {featuredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg overflow-hidden border border-slate-200 hover:shadow-xl transition"
                  >
                    <div className={`bg-gradient-to-r ${template.color} h-32 flex items-center justify-center text-5xl`}>
                      {template.icon}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
                      <p className="text-slate-600 text-sm mb-4">{template.description}</p>
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

          <div className="text-center">
            <a
              href="/templates"
              className="inline-block px-6 py-3 border-2 rounded-lg font-semibold transition"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Browse All {ALL_TEMPLATES.length} Templates →
            </a>
          </div>
        </div>
      </section>


      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard icon="🌳" title="Unlimited Hierarchy Depth" description="Create organizational structures of any depth and complexity" color={primaryColor} />
            <FeatureCard icon="🔐" title="132 Fine-Grained Capabilities" description="Grant or revoke specific powers for individual users" color={primaryColor} />
            <FeatureCard icon="👥" title="Role-Based Access Control" description="Pre-built roles with customizable permissions" color={primaryColor} />
            <FeatureCard icon="📊" title="Modular Architecture" description="Enable/disable modules per tenant as needed" color={primaryColor} />
            <FeatureCard icon="🏗️" title="Multi-Tenant Ready" description="Complete isolation between organizations" color={primaryColor} />
            <FeatureCard icon="📝" title="Audit & Compliance" description="Complete audit trails and compliance tracking" color={primaryColor} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-white/90 text-lg mb-8">Choose your template and submit an enquiry. We'll customize your portal instantly.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#featured"
              className="px-8 py-4 bg-white rounded-lg font-bold text-lg hover:shadow-lg transition"
              style={{ color: primaryColor }}
            >
              Choose Template ↑
            </a>
            <a
              href="/demo"
              className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition"
            >
              👀 Preview Demo
            </a>
          </div>
        </div>
      </section>

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

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">ERP</h3>
              <p className="text-sm">Enterprise ERP for every industry.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    API Reference
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>© 2026 ERP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description, color }: any) {
  return (
    <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          orgName: formData.organization,
          contactName: formData.name,
          contactEmail: formData.email,
          message: formData.message,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        // Surface the real reason rather than claiming success, which is what the previous
        // console.log stub did for every submission.
        setError(json.error || 'Could not send your enquiry. Please try again.');
        setSending(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2500);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
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

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

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
                disabled={sending}
                className="w-full py-3 text-white rounded-lg font-semibold transition hover:shadow-lg disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {sending ? 'Sending…' : 'Submit Enquiry'}
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

function StatBox({ number, label, icon }: { number: string; label: string; icon: string }) {
  return (
    <div className="text-center p-8 rounded-lg bg-slate-50 border border-slate-200">
      <div className="text-5xl mb-3">{icon}</div>
      <div className="text-4xl font-bold text-blue-600 mb-2">{number}</div>
      <div className="text-slate-600 font-medium">{label}</div>
    </div>
  );
}

function StepBox({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-block w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

function TechBox({ title, items, color }: { title: string; items: string[]; color: string }) {
  const bgColor = color === "blue" ? "bg-blue-50" : color === "purple" ? "bg-purple-50" : "bg-green-50";
  const borderColor = color === "blue" ? "border-blue-200" : color === "purple" ? "border-purple-200" : "border-green-200";
  const textColor = color === "blue" ? "text-blue-700" : color === "purple" ? "text-purple-700" : "text-green-700";

  return (
    <div className={`p-8 rounded-lg ${bgColor} border ${borderColor}`}>
      <h3 className={`text-xl font-bold ${textColor} mb-6`}>{title}</h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-700">
            <span className={`w-2 h-2 rounded-full ${textColor}`}></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
