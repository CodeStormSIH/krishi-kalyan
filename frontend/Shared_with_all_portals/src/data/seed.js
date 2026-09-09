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
export const names = [];
export const initialData = {
  centers,
  profiles: {},
  farmers: [],
  tokens: [],
  notifications: [],
  history: [],
  users: [],
  alerts: [],
  tickets: [],
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

