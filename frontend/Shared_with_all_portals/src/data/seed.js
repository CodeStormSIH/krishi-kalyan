export const today = new Date().toLocaleDateString('en-CA');
export const dateISO = () => {const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');};
export const stages = ['Token Generated', 'Farmer Checked-In', 'Under Verification', 'Quality Check', 'Weighing & Recording', 'Completed'];
export const centers = ['Samastipur', 'Darbhanga', 'Muzaffarpur', 'Begusarai', 'Purnia'].map((district, i) => ({
  id: `SPC${1234 + i}`,
  name: `${district} Center`,
  district,
  address: `Vill. ${district}, Block ${district}, Bihar`,
  distance: [10, 20, 28, 45, 52][i],
  manager: ['Rajesh Kumar', 'Sunita Devi', 'Amit Kumar', 'Vikash Singh', 'Pooja Kumari'][i],
  status: 'Active',
  served: 2845 - i * 185,
  phone: '9876543210',
  email: `${district.toLowerCase()}@example.org`
}));
export const names = ['Ram Prasad', 'Sita Devi', 'Mahesh Singh', 'Ramesh Yadav', 'Sujata Kumari', 'Vikash Kumar', 'Anil Kumar', 'Pooja Kumari', 'Deepak Singh', 'Sunil Yadav', 'Ravi Kumar', 'Neha Devi', 'Asha Kumari', 'Mohan Singh', 'Raj Kumar', 'Geeta Devi', 'Sanjay Yadav', 'Meena Kumari', 'Ajay Singh', 'Rekha Devi', 'Shyam Kumar', 'Nisha Kumari', 'Rakesh Singh', 'Radha Devi'];
export const initialData = {
  centers,
  profiles: {
    farmer: {
      name: 'Ram Prasad',
      email: 'ramprasad12@example.com',
      phone: '9876543210',
      dob: '1985-01-15',
      address: centers[0].address
    },
    operator: {
      name: 'Center Operator',
      email: 'operator@example.com',
      phone: '9876543211',
      address: centers[0].address
    },
    admin: {
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '9876543212',
      address: 'Patna, Bihar'
    }
  },
  farmers: names.map((name, i) => ({
    id: `KRN${123456 + i}`,
    name,
    phone: String(9876543210 + i),
    district: centers[i % 5].district,
    crop: ['Wheat', 'Paddy', 'Maize'][i % 3],
    status: i % 7 === 6 ? 'Inactive' : 'Active',
    registered: '2026-08-12',
    email: `farmer${i + 1}@example.com`
  })),
  tokens: names.map((name, i) => ({
    id: `TK${245689 + i}`,
    farmerId: `KRN${123456 + i}`,
    name,
    center: centers[i === 0 ? 0 : i % 5].name,
    date: dateISO(),
    slot: ['09:00 AM - 10:00 AM', '10:30 AM - 11:30 AM', '12:00 PM - 01:00 PM'][i % 3],
    crop: ['Wheat', 'Paddy', 'Maize'][i % 3],
    quantity: 20 + i % 5,
    variety: 'HD 2967',
    rate: 2125,
    stage: i === 0 ? 2 : i % 6,
    status: i === 0 ? 'Checked In' : i % 6 === 5 ? 'Completed' : i % 7 === 6 ? 'Cancelled' : i % 6 === 0 ? 'In Queue' : i % 6 === 1 ? 'Checked In' : 'In Process',
    position: i + 1,
    notes: [],
    payment: i % 6 === 5 ? 'Paid' : i % 7 === 6 ? 'Failed' : 'Pending'
  })),
  notifications: [['Checked-In Successful', 'You have been checked in successfully at the center.', 'Updates'], ['Token Generated', 'Your token TK245689 has been generated successfully.', 'Updates'], ['Reach on Time', 'Please reach the center 30 minutes before your slot.', 'Alerts'], ['Payment Update', 'Your previous procurement payment has been credited.', 'Updates'], ['Documents Required', 'Bring your Aadhaar, Kisan card and land documents.', 'Important'], ['Center Announcement', 'Lunch break is from 1:30 PM to 2:00 PM.', 'Alerts'], ['Procurement Guidelines', 'Keep your crop ready for quality verification.', 'Important']].map(([title, message, category], i) => ({
    id: `NT${100 + i}`,
    title,
    message,
    category,
    read: i > 2,
    date: dateISO(),
    time: `${9 + i}:15`,
    audience: 'All Farmers',
    priority: 'Normal',
    delivery: 'Sent'
  })),
  history: Array.from({
    length: 17
  }, (_, i) => ({
    id: `TK${245487 - i * 23}`,
    name: 'Ram Prasad',
    center: centers[i % 5].name,
    date: `2026-08-${String(28 - i).padStart(2, '0')}`,
    crop: ['Wheat', 'Paddy', 'Maize'][i % 3],
    quantity: 20 - i % 4,
    rate: 2125,
    status: i % 5 === 3 ? 'Cancelled' : 'Completed',
    payment: i % 5 === 3 ? 'Cancelled' : 'Paid'
  })),
  users: names.slice(0, 9).map((name, i) => ({
    id: `USR${100 + i}`,
    name,
    email: `user${i}@example.com`,
    role: ['Admin', 'Center Operator', 'Support Staff'][i % 3],
    center: centers[i % 5].name,
    status: 'Active',
    lastLogin: dateISO()
  })),
  alerts: ['High Queue Length', 'Payment Delay', 'Token Expiry', 'Unusual Procurement', 'Failed Payment', 'Center Performance Issue'].map((title, i) => ({
    id: `AL${100 + i}`,
    title,
    center: centers[i % 5].name,
    severity: i % 2 ? 'Medium' : 'High',
    date: dateISO(),
    status: 'Open',
    description: ['Queue exceeds the configured capacity. Review staffing and call waiting farmers.', 'Payment settlement is delayed. Review the transaction and bank response.', 'Unserved bookings are approaching expiry. Contact the affected farmers.'][i % 3]
  })),
  tickets: [{
    id: 'TKT1001',
    name: 'Ram Prasad',
    role: 'farmer',
    category: 'Payment',
    priority: 'High',
    subject: 'Payment not received',
    description: 'Please check the bank settlement for my previous procurement.',
    status: 'Open',
    date: dateISO(),
    replies: []
  }],
  settings: {
    admin: {
      systemName: 'Krishi Kalyan',
      language: 'English',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD MMM YYYY',
      timeFormat: '12 hour',
      phone: '18001234567',
      capacity: 150,
      sessionTimeout: 30,
      sms: true,
      email: true,
      inApp: true,
      requireMfa: false,
      apiUrl: '',
      opening: '09:00',
      closing: '18:00'
    },
    operator: {
      name: centers[0].name,
      code: centers[0].id,
      address: centers[0].address,
      phone: '9876543210',
      email: 'samastipur@example.com',
      opening: '09:00',
      closing: '18:00',
      breakStart: '13:30',
      breakEnd: '14:00',
      sms: true,
      inApp: true
    }
  },
  permissions: {
    Admin: ['View reports', 'Manage farmers', 'Manage centers'],
    'Center Operator': ['Manage queue', 'Update procurement'],
    'Support Staff': ['Manage tickets']
  },
  queueLog: [],
  selectedCenter: centers[0].name
};

