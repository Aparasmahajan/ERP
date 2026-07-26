export const TEMPLATE_DEMOS = {
  // ===== EDUCATION =====
  'student-info-system': {
    name: 'Student Information System',
    icon: '🎓',
    tenant: { name: 'Greenwood Academy', pack: 'INSTITUTION' },
    roles: [
      { name: 'Principal', code: 'PRIN', color: 'bg-blue-500', description: 'Head of Institution' },
      { name: 'Vice Principal', code: 'VP', color: 'bg-blue-400', description: 'Deputy Head' },
      { name: 'Registrar', code: 'REG', color: 'bg-blue-300', description: 'Academic Administration' },
      { name: 'Head of Department', code: 'HOD', color: 'bg-purple-500', description: 'Department Lead' },
      { name: 'Class Coordinator', code: 'CC', color: 'bg-purple-400', description: 'Class Management' },
      { name: 'Faculty', code: 'FAC', color: 'bg-green-500', description: 'Teachers' },
      { name: 'Student', code: 'STU', color: 'bg-yellow-500', description: 'Learners' },
      { name: 'Parent', code: 'PAR', color: 'bg-gray-500', description: 'Guardians' },
    ],
    users: [
      { name: 'Dr. Richard Thompson', role: 'Principal', code: 'PRIN001', status: 'ACTIVE' },
      { name: 'Ms. Sarah Johnson', role: 'Vice Principal', code: 'VP001', status: 'ACTIVE' },
      { name: 'Prof. James Wilson', role: 'Registrar', code: 'REG001', status: 'ACTIVE' },
      { name: 'Dr. Emily Davis', role: 'Head of Department', code: 'HOD001', status: 'ACTIVE' },
      { name: 'Mrs. Lisa Brown', role: 'Head of Department', code: 'HOD002', status: 'ACTIVE' },
      { name: 'Mr. Robert Miller', role: 'Class Coordinator', code: 'CC001', status: 'ACTIVE' },
      { name: 'Ms. Jennifer Lee', role: 'Faculty', code: 'FAC001', status: 'ACTIVE' },
      { name: 'Mr. David Martinez', role: 'Faculty', code: 'FAC002', status: 'ACTIVE' },
      { name: 'Alice Brown', role: 'Student', code: 'STU001', status: 'ACTIVE' },
      { name: 'Bob Smith', role: 'Student', code: 'STU002', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 450, activeUsers: 445, totalRoles: 8, pendingApprovals: 3 },
    features: ['Enrollment', 'Attendance Tracking', 'Grade Management', 'Parent Portal', 'Fee Management', 'Timetable'],
  },

  'course-management-platform': {
    name: 'Course Management Platform',
    icon: '📚',
    tenant: { name: 'EduOnline Academy', pack: 'INSTITUTION' },
    roles: [
      { name: 'Platform Admin', code: 'ADMIN', color: 'bg-blue-600', description: 'System Administrator' },
      { name: 'Course Director', code: 'DIR', color: 'bg-blue-500', description: 'Course Management' },
      { name: 'Instructor', code: 'INS', color: 'bg-purple-500', description: 'Course Delivery' },
      { name: 'Teaching Assistant', code: 'TA', color: 'bg-purple-400', description: 'Course Support' },
      { name: 'Student', code: 'STU', color: 'bg-green-500', description: 'Learners' },
    ],
    users: [
      { name: 'John Anderson', role: 'Platform Admin', code: 'ADMIN001', status: 'ACTIVE' },
      { name: 'Dr. Patricia Wilson', role: 'Course Director', code: 'DIR001', status: 'ACTIVE' },
      { name: 'Dr. Michael Chen', role: 'Course Director', code: 'DIR002', status: 'ACTIVE' },
      { name: 'Ms. Rebecca Taylor', role: 'Instructor', code: 'INS001', status: 'ACTIVE' },
      { name: 'Mr. Kevin Jones', role: 'Instructor', code: 'INS002', status: 'ACTIVE' },
      { name: 'Emma White', role: 'Teaching Assistant', code: 'TA001', status: 'ACTIVE' },
      { name: 'Student 1', role: 'Student', code: 'STU001', status: 'ACTIVE' },
      { name: 'Student 2', role: 'Student', code: 'STU002', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 1250, activeUsers: 1180, totalRoles: 5, pendingApprovals: 8 },
    features: ['Live Classes', 'Assignments', 'Progress Tracking', 'Certifications', 'Discussion Forum', 'Payments'],
  },

  // ===== OFFICE =====
  'employee-management-suite': {
    name: 'Employee Management Suite',
    icon: '👔',
    tenant: { name: 'TechCorp Industries', pack: 'ORGANISATION' },
    roles: [
      { name: 'Chief Executive Officer', code: 'CEO', color: 'bg-red-600', description: 'Executive Head' },
      { name: 'CFO', code: 'CFO', color: 'bg-red-500', description: 'Finance Head' },
      { name: 'CTO', code: 'CTO', color: 'bg-blue-600', description: 'Technology Head' },
      { name: 'Department Manager', code: 'DEPTMGR', color: 'bg-purple-500', description: 'Department Lead' },
      { name: 'Team Lead', code: 'TL', color: 'bg-green-500', description: 'Team Management' },
      { name: 'Employee', code: 'EMP', color: 'bg-yellow-500', description: 'Staff Member' },
      { name: 'HR Manager', code: 'HR', color: 'bg-pink-500', description: 'Human Resources' },
    ],
    users: [
      { name: 'Mr. David Thompson', role: 'Chief Executive Officer', code: 'CEO001', status: 'ACTIVE' },
      { name: 'Ms. Sarah Johnson', role: 'CFO', code: 'CFO001', status: 'ACTIVE' },
      { name: 'Dr. Michael Chen', role: 'CTO', code: 'CTO001', status: 'ACTIVE' },
      { name: 'Mr. Robert Davis', role: 'HR Manager', code: 'HR001', status: 'ACTIVE' },
      { name: 'Ms. Jennifer Lee', role: 'Department Manager', code: 'DEPTMGR001', status: 'ACTIVE' },
      { name: 'Mr. James Wilson', role: 'Department Manager', code: 'DEPTMGR002', status: 'ACTIVE' },
      { name: 'Ms. Emily Brown', role: 'Team Lead', code: 'TL001', status: 'ACTIVE' },
      { name: 'Employee 1', role: 'Employee', code: 'EMP001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 320, activeUsers: 315, totalRoles: 7, pendingApprovals: 5 },
    features: ['Org Chart', 'Skills Matrix', 'Team Directory', 'Department Management', 'Employee Records', 'Approvals'],
  },

  'project-management-suite': {
    name: 'Project Management Suite',
    icon: '📊',
    tenant: { name: 'Digital Solutions Ltd', pack: 'ORGANISATION' },
    roles: [
      { name: 'Executive Director', code: 'EXEC', color: 'bg-blue-600', description: 'Executive Management' },
      { name: 'Project Manager', code: 'PM', color: 'bg-purple-500', description: 'Project Lead' },
      { name: 'Team Lead', code: 'TL', color: 'bg-green-500', description: 'Team Management' },
      { name: 'Developer', code: 'DEV', color: 'bg-cyan-500', description: 'Development Team' },
      { name: 'QA Engineer', code: 'QA', color: 'bg-yellow-500', description: 'Quality Assurance' },
      { name: 'Stakeholder', code: 'STK', color: 'bg-gray-500', description: 'Business Stakeholder' },
    ],
    users: [
      { name: 'Mr. Alex Martinez', role: 'Executive Director', code: 'EXEC001', status: 'ACTIVE' },
      { name: 'Ms. Lisa Anderson', role: 'Project Manager', code: 'PM001', status: 'ACTIVE' },
      { name: 'Mr. Kevin Zhou', role: 'Project Manager', code: 'PM002', status: 'ACTIVE' },
      { name: 'Ms. Rachel Green', role: 'Team Lead', code: 'TL001', status: 'ACTIVE' },
      { name: 'Developer 1', role: 'Developer', code: 'DEV001', status: 'ACTIVE' },
      { name: 'QA Engineer 1', role: 'QA Engineer', code: 'QA001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 85, activeUsers: 82, totalRoles: 6, pendingApprovals: 2 },
    features: ['Task Planning', 'Resource Allocation', 'Timeline Tracking', 'Team Collaboration', 'Risk Management', 'Budget Tracking'],
  },

  // ===== HEALTHCARE =====
  'patient-management-system': {
    name: 'Patient Management System',
    icon: '🏥',
    tenant: { name: 'City Hospital', pack: 'INSTITUTION' },
    roles: [
      { name: 'Hospital Administrator', code: 'ADMIN', color: 'bg-red-600', description: 'Hospital Management' },
      { name: 'Chief Medical Officer', code: 'CMO', color: 'bg-red-500', description: 'Medical Head' },
      { name: 'Doctor', code: 'DR', color: 'bg-blue-500', description: 'Physician' },
      { name: 'Nurse', code: 'NRS', color: 'bg-pink-500', description: 'Nursing Staff' },
      { name: 'Receptionist', code: 'REC', color: 'bg-purple-400', description: 'Front Desk' },
      { name: 'Patient', code: 'PAT', color: 'bg-green-500', description: 'Patient' },
    ],
    users: [
      { name: 'Dr. James Patterson', role: 'Hospital Administrator', code: 'ADMIN001', status: 'ACTIVE' },
      { name: 'Prof. Michael Thomson', role: 'Chief Medical Officer', code: 'CMO001', status: 'ACTIVE' },
      { name: 'Dr. Sarah Wilson', role: 'Doctor', code: 'DR001', status: 'ACTIVE' },
      { name: 'Dr. Robert Khan', role: 'Doctor', code: 'DR002', status: 'ACTIVE' },
      { name: 'Ms. Jennifer Ross', role: 'Nurse', code: 'NRS001', status: 'ACTIVE' },
      { name: 'Ms. Maria Garcia', role: 'Receptionist', code: 'REC001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 200, activeUsers: 195, totalRoles: 6, pendingApprovals: 4 },
    features: ['Patient Records', 'Appointment Scheduling', 'Medical History', 'Prescription Tracking', 'Billing System', 'Doctor Scheduling'],
  },

  // ===== NGO =====
  'volunteer-management-portal': {
    name: 'Volunteer Management Portal',
    icon: '❤️',
    tenant: { name: 'Hope Foundation', pack: 'ORGANISATION' },
    roles: [
      { name: 'Executive Director', code: 'ED', color: 'bg-green-600', description: 'Organization Head' },
      { name: 'Program Manager', code: 'PM', color: 'bg-green-500', description: 'Program Lead' },
      { name: 'Volunteer Coordinator', code: 'VC', color: 'bg-blue-500', description: 'Volunteer Management' },
      { name: 'Volunteer', code: 'VOL', color: 'bg-yellow-500', description: 'Volunteer' },
      { name: 'Beneficiary', code: 'BEN', color: 'bg-purple-500', description: 'Program Beneficiary' },
    ],
    users: [
      { name: 'Mr. David Kumar', role: 'Executive Director', code: 'ED001', status: 'ACTIVE' },
      { name: 'Ms. Priya Sharma', role: 'Program Manager', code: 'PM001', status: 'ACTIVE' },
      { name: 'Mr. Arjun Singh', role: 'Volunteer Coordinator', code: 'VC001', status: 'ACTIVE' },
      { name: 'Volunteer 1', role: 'Volunteer', code: 'VOL001', status: 'ACTIVE' },
      { name: 'Beneficiary 1', role: 'Beneficiary', code: 'BEN001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 320, activeUsers: 290, totalRoles: 5, pendingApprovals: 12 },
    features: ['Volunteer Tracking', 'Event Management', 'Hours Logging', 'Impact Reports', 'Donations', 'Campaigns'],
  },

  // ===== RETAIL =====
  'retail-operations-hub': {
    name: 'Retail Operations Hub',
    icon: '🛒',
    tenant: { name: 'MegaStore Network', pack: 'ORGANISATION' },
    roles: [
      { name: 'Regional Manager', code: 'RM', color: 'bg-orange-600', description: 'Regional Lead' },
      { name: 'Store Manager', code: 'SM', color: 'bg-orange-500', description: 'Store Head' },
      { name: 'Department Head', code: 'DH', color: 'bg-red-500', description: 'Department Lead' },
      { name: 'Sales Associate', code: 'SA', color: 'bg-yellow-500', description: 'Sales Staff' },
      { name: 'Inventory Manager', code: 'INV', color: 'bg-blue-500', description: 'Inventory' },
      { name: 'Cashier', code: 'CASH', color: 'bg-green-500', description: 'Checkout' },
    ],
    users: [
      { name: 'Mr. James Richardson', role: 'Regional Manager', code: 'RM001', status: 'ACTIVE' },
      { name: 'Ms. Linda Martinez', role: 'Store Manager', code: 'SM001', status: 'ACTIVE' },
      { name: 'Mr. Peter Johnson', role: 'Store Manager', code: 'SM002', status: 'ACTIVE' },
      { name: 'Ms. Angela Davis', role: 'Department Head', code: 'DH001', status: 'ACTIVE' },
      { name: 'Sales Associate 1', role: 'Sales Associate', code: 'SA001', status: 'ACTIVE' },
      { name: 'Inventory Manager', role: 'Inventory Manager', code: 'INV001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 450, activeUsers: 440, totalRoles: 6, pendingApprovals: 6 },
    features: ['Inventory Management', 'Multi-Store Sync', 'Stock Alerts', 'POS Integration', 'Supplier Management', 'Sales Analytics'],
  },

  // ===== GYM =====
  'fitness-center-management': {
    name: 'Fitness Center Management',
    icon: '💪',
    tenant: { name: 'PowerFit Gyms', pack: 'ORGANISATION' },
    roles: [
      { name: 'Regional Director', code: 'RD', color: 'bg-red-600', description: 'Regional Lead' },
      { name: 'Center Manager', code: 'CM', color: 'bg-red-500', description: 'Center Head' },
      { name: 'Head Trainer', code: 'HT', color: 'bg-yellow-600', description: 'Training Lead' },
      { name: 'Fitness Trainer', code: 'FT', color: 'bg-yellow-500', description: 'Trainer' },
      { name: 'Receptionist', code: 'REC', color: 'bg-blue-500', description: 'Front Desk' },
      { name: 'Member', code: 'MEM', color: 'bg-green-500', description: 'Gym Member' },
    ],
    users: [
      { name: 'Mr. Marcus Stone', role: 'Regional Director', code: 'RD001', status: 'ACTIVE' },
      { name: 'Ms. Victoria Turner', role: 'Center Manager', code: 'CM001', status: 'ACTIVE' },
      { name: 'Mr. Alex Romano', role: 'Head Trainer', code: 'HT001', status: 'ACTIVE' },
      { name: 'Trainer 1', role: 'Fitness Trainer', code: 'FT001', status: 'ACTIVE' },
      { name: 'Receptionist 1', role: 'Receptionist', code: 'REC001', status: 'ACTIVE' },
      { name: 'Member 1', role: 'Member', code: 'MEM001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 580, activeUsers: 520, totalRoles: 6, pendingApprovals: 8 },
    features: ['Member Registry', 'Class Scheduling', 'Trainer Profiles', 'Billing System', 'Progress Analytics', 'Attendance Tracking'],
  },

  // ===== LOGISTICS =====
  'logistics-fleet-management': {
    name: 'Logistics Fleet Management',
    icon: '🚚',
    tenant: { name: 'QuickShip Logistics', pack: 'ORGANISATION' },
    roles: [
      { name: 'Operations Director', code: 'OD', color: 'bg-yellow-700', description: 'Operations Head' },
      { name: 'Fleet Manager', code: 'FM', color: 'bg-yellow-600', description: 'Fleet Lead' },
      { name: 'Route Manager', code: 'RM', color: 'bg-yellow-500', description: 'Route Planning' },
      { name: 'Driver', code: 'DRV', color: 'bg-blue-500', description: 'Driver' },
      { name: 'Dispatcher', code: 'DISP', color: 'bg-purple-500', description: 'Dispatch' },
      { name: 'Maintenance Staff', code: 'MAINT', color: 'bg-red-500', description: 'Fleet Maintenance' },
    ],
    users: [
      { name: 'Mr. Robert Wilson', role: 'Operations Director', code: 'OD001', status: 'ACTIVE' },
      { name: 'Mr. Carlos Rodriguez', role: 'Fleet Manager', code: 'FM001', status: 'ACTIVE' },
      { name: 'Ms. Nina Patel', role: 'Route Manager', code: 'RM001', status: 'ACTIVE' },
      { name: 'Driver 1', role: 'Driver', code: 'DRV001', status: 'ACTIVE' },
      { name: 'Dispatcher 1', role: 'Dispatcher', code: 'DISP001', status: 'ACTIVE' },
      { name: 'Maintenance 1', role: 'Maintenance Staff', code: 'MAINT001', status: 'ACTIVE' },
    ],
    stats: { totalUsers: 220, activeUsers: 210, totalRoles: 6, pendingApprovals: 3 },
    features: ['Fleet Tracking', 'Route Optimization', 'Delivery Status', 'Driver Management', 'Vehicle Maintenance', 'Analytics'],
  },
};

export type TemplateId = keyof typeof TEMPLATE_DEMOS;
export type TemplateDemo = (typeof TEMPLATE_DEMOS)[TemplateId];
