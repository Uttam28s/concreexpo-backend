import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Surat, Gujarat...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.workerVisit.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.clientType.deleteMany({});
  await prisma.user.deleteMany({ where: { role: 'ENGINEER' } });
  console.log('✅ Existing data cleared');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wallfloor.com' },
    update: {},
    create: {
      email: 'admin@wallfloor.com',
      password: adminPassword,
      name: 'Rahul Mehta',
      mobileNumber: '+919825012345',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create 25 Engineers with Gujarati/Indian names
  const engineersData = [
    { name: 'Amit Patel', email: 'amit.patel@wallfloor.com', mobile: '+919825112233' },
    { name: 'Nirav Shah', email: 'nirav.shah@wallfloor.com', mobile: '+919825112234' },
    { name: 'Kiran Desai', email: 'kiran.desai@wallfloor.com', mobile: '+919825112235' },
    { name: 'Hardik Thakkar', email: 'hardik.thakkar@wallfloor.com', mobile: '+919825112236' },
    { name: 'Priya Joshi', email: 'priya.joshi@wallfloor.com', mobile: '+919825112237' },
    { name: 'Dhruv Pandya', email: 'dhruv.pandya@wallfloor.com', mobile: '+919825112238' },
    { name: 'Ravi Kumar', email: 'ravi.kumar@wallfloor.com', mobile: '+919825112239' },
    { name: 'Sanjay Parikh', email: 'sanjay.parikh@wallfloor.com', mobile: '+919825112240' },
    { name: 'Vishal Chauhan', email: 'vishal.chauhan@wallfloor.com', mobile: '+919825112241' },
    { name: 'Rohan Mehta', email: 'rohan.mehta@wallfloor.com', mobile: '+919825112242' },
    { name: 'Ankit Trivedi', email: 'ankit.trivedi@wallfloor.com', mobile: '+919825112243' },
    { name: 'Chirag Vora', email: 'chirag.vora@wallfloor.com', mobile: '+919825112244' },
    { name: 'Darshan Amin', email: 'darshan.amin@wallfloor.com', mobile: '+919825112245' },
    { name: 'Ketul Modi', email: 'ketul.modi@wallfloor.com', mobile: '+919825112246' },
    { name: 'Mahesh Gandhi', email: 'mahesh.gandhi@wallfloor.com', mobile: '+919825112247' },
    { name: 'Nayan Raval', email: 'nayan.raval@wallfloor.com', mobile: '+919825112248' },
    { name: 'Paresh Solanki', email: 'paresh.solanki@wallfloor.com', mobile: '+919825112249' },
    { name: 'Rajesh Bhavsar', email: 'rajesh.bhavsar@wallfloor.com', mobile: '+919825112250' },
    { name: 'Suresh Doshi', email: 'suresh.doshi@wallfloor.com', mobile: '+919825112251' },
    { name: 'Vijay Kapadia', email: 'vijay.kapadia@wallfloor.com', mobile: '+919825112252' },
    { name: 'Yash Acharya', email: 'yash.acharya@wallfloor.com', mobile: '+919825112253' },
    { name: 'Bhavesh Jani', email: 'bhavesh.jani@wallfloor.com', mobile: '+919825112254' },
    { name: 'Jignesh Raval', email: 'jignesh.raval@wallfloor.com', mobile: '+919825112255' },
    { name: 'Kalpesh Dave', email: 'kalpesh.dave@wallfloor.com', mobile: '+919825112256' },
    { name: 'Pratik Bhatt', email: 'pratik.bhatt@wallfloor.com', mobile: '+919825112257' },
  ];

  const engineers = [];
  const engineerPassword = await bcrypt.hash('Engineer@123', 10);

  for (const engData of engineersData) {
    const engineer = await prisma.user.create({
      data: {
        email: engData.email,
        password: engineerPassword,
        name: engData.name,
        mobileNumber: engData.mobile,
        role: 'ENGINEER',
        isActive: true,
      },
    });
    engineers.push(engineer);
  }
  console.log(`✅ ${engineers.length} Engineers created`);

  // Create Client Types
  const clientTypesData = [
    'Individual Client',
    'Builder/Developer',
    'Contractor',
    'Architect',
    'Interior Designer',
    'Property Developer',
    'Real Estate Firm',
    'Construction Company',
    'Housing Society',
    'Commercial Complex',
  ];

  const clientTypes = [];
  for (const typeName of clientTypesData) {
    const type = await prisma.clientType.create({
      data: { name: typeName },
    });
    clientTypes.push(type);
  }
  console.log(`✅ ${clientTypes.length} Client types created`);

  // Create 25+ Clients with Surat addresses
  const clientsData = [
    { name: 'Patel Builders', type: 'Builder/Developer', address: 'Plot No. 123, Vesu, Surat - 395007', primary: '+919825223344', secondary: '+919825223345' },
    { name: 'Shah Construction', type: 'Construction Company', address: 'B-45, Adajan Patia, Surat - 395009', primary: '+919825223346', secondary: '+919825223347' },
    { name: 'Rajesh Desai', type: 'Individual Client', address: '301, Shukan Residency, Piplod, Surat - 395007', primary: '+919825223348', secondary: null },
    { name: 'Green Valley Developers', type: 'Property Developer', address: 'C-102, Citylight Road, Surat - 395007', primary: '+919825223349', secondary: '+919825223350' },
    { name: 'Mehta Interiors', type: 'Interior Designer', address: 'Shop 7, Ghod Dod Road, Surat - 395001', primary: '+919825223351', secondary: null },
    { name: 'Sunrise Builders', type: 'Builder/Developer', address: 'F-201, Pal, Surat - 395009', primary: '+919825223352', secondary: '+919825223353' },
    { name: 'Kirti Thakkar', type: 'Individual Client', address: '102, Ashirwad Society, Majura Gate, Surat - 395002', primary: '+919825223354', secondary: null },
    { name: 'Diamond City Developers', type: 'Property Developer', address: 'A-303, LP Savani Road, Surat - 395006', primary: '+919825223355', secondary: '+919825223356' },
    { name: 'Archit Design Studio', type: 'Architect', address: '2nd Floor, Ring Road, Surat - 395002', primary: '+919825223357', secondary: '+919825223358' },
    { name: 'Royal Contractors', type: 'Contractor', address: 'Plot 456, Katargam, Surat - 395004', primary: '+919825223359', secondary: '+919825223360' },
    { name: 'Shilpa Builders', type: 'Builder/Developer', address: 'B-103, Althan, Surat - 395017', primary: '+919825223361', secondary: '+919825223362' },
    { name: 'Pratik Shah', type: 'Individual Client', address: 'Bungalow 12, Dumas Road, Surat - 395007', primary: '+919825223363', secondary: null },
    { name: 'Metro Construction', type: 'Construction Company', address: 'G-5, Parle Point, Surat - 395007', primary: '+919825223364', secondary: '+919825223365' },
    { name: 'Elegant Homes', type: 'Real Estate Firm', address: 'Office 301, VIP Plaza, Surat - 395007', primary: '+919825223366', secondary: '+919825223367' },
    { name: 'Hardik Properties', type: 'Property Developer', address: 'D-204, Udhna, Surat - 394210', primary: '+919825223368', secondary: '+919825223369' },
    { name: 'Anand Housing Society', type: 'Housing Society', address: 'Jahangirpura, Surat - 395005', primary: '+919825223370', secondary: '+919825223371' },
    { name: 'Neha Interior Solutions', type: 'Interior Designer', address: 'Shop 15, Textile Market, Surat - 395002', primary: '+919825223372', secondary: null },
    { name: 'Godrej Sky Developers', type: 'Commercial Complex', address: 'Tower A, VIP Road, Surat - 395007', primary: '+919825223373', secondary: '+919825223374' },
    { name: 'Ashish Pandya', type: 'Individual Client', address: 'Villa 7, Sama Savli Road, Surat - 395006', primary: '+919825223375', secondary: null },
    { name: 'Supreme Builders', type: 'Builder/Developer', address: 'Plot 789, Magdalla, Surat - 395007', primary: '+919825223376', secondary: '+919825223377' },
    { name: 'Krishna Developers', type: 'Property Developer', address: 'E-401, Bhatar Road, Surat - 395007', primary: '+919825223378', secondary: '+919825223379' },
    { name: 'Vedant Construction', type: 'Contractor', address: 'F-12, Limbayat, Surat - 395006', primary: '+919825223380', secondary: '+919825223381' },
    { name: 'Sankalp Architects', type: 'Architect', address: '3rd Floor, Athwa Gate, Surat - 395001', primary: '+919825223382', secondary: '+919825223383' },
    { name: 'Radhe Builders', type: 'Builder/Developer', address: 'A-501, Rander Road, Surat - 395005', primary: '+919825223384', secondary: '+919825223385' },
    { name: 'Shreenath Plaza', type: 'Commercial Complex', address: 'Lal Darwaja, Surat - 395003', primary: '+919825223386', secondary: '+919825223387' },
    { name: 'Gaurav Joshi', type: 'Individual Client', address: 'Flat 201, City Light Town, Surat - 395007', primary: '+919825223388', secondary: null },
  ];

  const clients = [];
  for (const clientData of clientsData) {
    const clientType = clientTypes.find(ct => ct.name === clientData.type);
    const client = await prisma.client.create({
      data: {
        name: clientData.name,
        address: clientData.address,
        primaryContact: clientData.primary,
        secondaryContact: clientData.secondary,
        clientTypeId: clientType!.id,
        isActive: true,
      },
    });
    clients.push(client);
  }
  console.log(`✅ ${clients.length} Clients created`);

  // Create 25+ Materials
  const materialsData = [
    { name: 'Asian Paints Wall Putty', unit: 'Bag (40 kg)', reorderLevel: 50 },
    { name: 'Birla White Cement', unit: 'Bag (50 kg)', reorderLevel: 40 },
    { name: 'Tile Adhesive - Grey', unit: 'Bag (25 kg)', reorderLevel: 60 },
    { name: 'Tile Adhesive - White', unit: 'Bag (25 kg)', reorderLevel: 60 },
    { name: 'Epoxy Grout - White', unit: 'Bucket (5 kg)', reorderLevel: 30 },
    { name: 'Epoxy Grout - Grey', unit: 'Bucket (5 kg)', reorderLevel: 30 },
    { name: 'Epoxy Grout - Black', unit: 'Bucket (5 kg)', reorderLevel: 25 },
    { name: 'Self-Leveling Compound', unit: 'Bag (25 kg)', reorderLevel: 40 },
    { name: 'Floor Hardener', unit: 'Bag (25 kg)', reorderLevel: 35 },
    { name: 'Waterproofing Membrane', unit: 'Roll (10m)', reorderLevel: 20 },
    { name: 'Liquid Waterproofing', unit: 'Bucket (20 L)', reorderLevel: 25 },
    { name: 'Primer - Concrete', unit: 'Bucket (20 L)', reorderLevel: 30 },
    { name: 'Primer - Wall', unit: 'Bucket (20 L)', reorderLevel: 30 },
    { name: 'Epoxy Floor Coating', unit: 'Bucket (20 L)', reorderLevel: 15 },
    { name: 'Silicone Sealant - Clear', unit: 'Cartridge', reorderLevel: 50 },
    { name: 'Silicone Sealant - White', unit: 'Cartridge', reorderLevel: 50 },
    { name: 'PU Foam Sealant', unit: 'Can', reorderLevel: 40 },
    { name: 'Tile Spacers - 2mm', unit: 'Packet (200 pcs)', reorderLevel: 100 },
    { name: 'Tile Spacers - 3mm', unit: 'Packet (200 pcs)', reorderLevel: 100 },
    { name: 'Tile Spacers - 5mm', unit: 'Packet (200 pcs)', reorderLevel: 80 },
    { name: 'Joint Filler', unit: 'Bag (5 kg)', reorderLevel: 30 },
    { name: 'Cement Slurry', unit: 'Bag (25 kg)', reorderLevel: 45 },
    { name: 'Tile Cleaner', unit: 'Bottle (1 L)', reorderLevel: 60 },
    { name: 'Granite Polish', unit: 'Bottle (1 L)', reorderLevel: 40 },
    { name: 'Floor Shine', unit: 'Bucket (5 L)', reorderLevel: 25 },
  ];

  const materials = [];
  for (const matData of materialsData) {
    const material = await prisma.material.create({
      data: {
        name: matData.name,
        unit: matData.unit,
        reorderLevel: matData.reorderLevel,
        isActive: true,
      },
    });
    materials.push(material);
  }
  console.log(`✅ ${materials.length} Materials created`);

  // Create 50+ Inventory Transactions (Stock In and Stock Out)
  console.log('Creating inventory transactions...');
  const inventoryTransactions = [];

  // Stock In transactions (30 transactions)
  for (let i = 0; i < 30; i++) {
    const material = materials[Math.floor(Math.random() * materials.length)];
    const quantity = Math.floor(Math.random() * 100) + 20; // 20-120 units
    const daysAgo = Math.floor(Math.random() * 60); // Last 60 days
    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() - daysAgo);

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        transactionType: 'STOCK_IN',
        quantity,
        transactionDate,
        remarks: i % 3 === 0 ? 'Bulk purchase from supplier' : undefined,
        createdBy: admin.id,
      },
    });
    inventoryTransactions.push(transaction);
  }

  // Stock Out transactions (30 transactions)
  for (let i = 0; i < 30; i++) {
    const material = materials[Math.floor(Math.random() * materials.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const quantity = Math.floor(Math.random() * 30) + 5; // 5-35 units
    const daysAgo = Math.floor(Math.random() * 45); // Last 45 days
    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() - daysAgo);

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        materialId: material.id,
        clientId: client.id,
        transactionType: 'STOCK_OUT',
        quantity,
        siteAddress: i % 2 === 0 ? client.address : undefined,
        transactionDate,
        remarks: i % 4 === 0 ? 'Delivered to site' : undefined,
        createdBy: admin.id,
      },
    });
    inventoryTransactions.push(transaction);
  }
  console.log(`✅ ${inventoryTransactions.length} Inventory transactions created`);

  // Create 35+ Appointments
  console.log('Creating appointments...');
  const appointments = [];
  const appointmentStatuses = ['SCHEDULED', 'OTP_SENT', 'VERIFIED', 'COMPLETED', 'CANCELLED'];

  for (let i = 0; i < 35; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const engineer = engineers[Math.floor(Math.random() * engineers.length)];

    // Mix of past, present, and future dates
    const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + daysOffset);
    visitDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // 9 AM to 5 PM

    let status = appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)];

    // Future appointments should be SCHEDULED or OTP_SENT
    if (daysOffset > 0) {
      status = Math.random() > 0.5 ? 'SCHEDULED' : 'OTP_SENT';
    }

    const purposes = [
      'Floor tile installation measurement',
      'Wall putty application inspection',
      'Waterproofing work verification',
      'Site survey for material requirement',
      'Quality check post installation',
      'Client meeting for design discussion',
    ];

    const feedbacks = [
      'Site is ready for installation. Recommended 5mm spacers for better finish.',
      'Floor leveling required before tile work. Ordered self-leveling compound.',
      'Waterproofing completed successfully. No leakage detected.',
      'Measured area: 2400 sq ft. Estimated material: 150 bags tile adhesive.',
      'Client requested white epoxy grout instead of grey.',
      'Installation completed as per schedule. Client satisfied with the work.',
    ];

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        engineerId: engineer.id,
        visitDate,
        purpose: purposes[Math.floor(Math.random() * purposes.length)],
        siteAddress: Math.random() > 0.3 ? client.address : undefined,
        googleMapsLink: Math.random() > 0.6 && client.address ? `https://maps.google.com/?q=${encodeURIComponent(client.address)}` : undefined,
        otpMobileNumber: Math.random() > 0.7 ? client.primaryContact : undefined,
        status: status as any,
        otp: ['OTP_SENT', 'VERIFIED', 'COMPLETED'].includes(status) ? '123456' : undefined,
        otpSentAt: ['OTP_SENT', 'VERIFIED', 'COMPLETED'].includes(status) ? new Date(visitDate.getTime() - 3600000) : undefined,
        otpExpiresAt: ['OTP_SENT', 'VERIFIED', 'COMPLETED'].includes(status) ? new Date(visitDate.getTime() + 86400000) : undefined,
        verifiedAt: ['VERIFIED', 'COMPLETED'].includes(status) ? visitDate : undefined,
        feedback: status === 'COMPLETED' && Math.random() > 0.3 ? feedbacks[Math.floor(Math.random() * feedbacks.length)] : undefined,
      },
    });
    appointments.push(appointment);
  }
  console.log(`✅ ${appointments.length} Appointments created`);

  // Create 35+ Worker Visits
  console.log('Creating worker visits...');
  const workerVisits = [];

  for (let i = 0; i < 35; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const engineer = engineers[Math.floor(Math.random() * engineers.length)];

    // Mix of past and future dates
    const daysOffset = Math.floor(Math.random() * 45) - 15; // -15 to +30 days
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + daysOffset);

    let status: 'PENDING' | 'OTP_VERIFIED' | 'COMPLETED' = 'PENDING';
    let workerCount: number | undefined;
    let remarks: string | undefined;
    let verifiedAt: Date | undefined;

    // Past visits should be verified/completed
    if (daysOffset < 0) {
      status = Math.random() > 0.3 ? 'OTP_VERIFIED' : 'PENDING';
      if (status === 'OTP_VERIFIED') {
        workerCount = Math.floor(Math.random() * 20) + 5; // 5-25 workers
        verifiedAt = visitDate;

        const remarksOptions = [
          'All workers present, work progressing well',
          'Short of 3 workers, will arrange by tomorrow',
          'Full team present, flooring work 60% complete',
          'Extra workers arranged for faster completion',
          'Work completed ahead of schedule',
        ];
        remarks = Math.random() > 0.4 ? remarksOptions[Math.floor(Math.random() * remarksOptions.length)] : undefined;
      }
    }

    const otpExpiry = new Date(visitDate);
    otpExpiry.setHours(otpExpiry.getHours() + 24);

    const visit = await prisma.workerVisit.create({
      data: {
        clientId: client.id,
        engineerId: engineer.id,
        visitDate,
        siteAddress: Math.random() > 0.3 ? client.address : undefined,
        otp: '654321',
        otpSentAt: new Date(visitDate.getTime() - 7200000),
        otpExpiresAt: otpExpiry,
        status,
        workerCount,
        remarks,
        verifiedAt,
      },
    });
    workerVisits.push(visit);
  }
  console.log(`✅ ${workerVisits.length} Worker visits created`);

  // Create settings
  await prisma.settings.upsert({
    where: { key: 'company_name' },
    update: { value: 'Concreexpo - Wall & Flooring Solutions' },
    create: {
      key: 'company_name',
      value: 'Concreexpo - Wall & Flooring Solutions',
    },
  });

  await prisma.settings.upsert({
    where: { key: 'admin_phone' },
    update: { value: '+919825012345' },
    create: {
      key: 'admin_phone',
      value: '+919825012345',
    },
  });

  await prisma.settings.upsert({
    where: { key: 'company_address' },
    update: { value: 'Ring Road, Surat, Gujarat - 395002' },
    create: {
      key: 'company_address',
      value: 'Ring Road, Surat, Gujarat - 395002',
    },
  });

  console.log('✅ Settings created');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • Admin: 1 (admin@wallfloor.com / Admin@123456)`);
  console.log(`   • Engineers: ${engineers.length} (password: Engineer@123)`);
  console.log(`   • Client Types: ${clientTypes.length}`);
  console.log(`   • Clients: ${clients.length}`);
  console.log(`   • Materials: ${materials.length}`);
  console.log(`   • Inventory Transactions: ${inventoryTransactions.length}`);
  console.log(`   • Appointments: ${appointments.length}`);
  console.log(`   • Worker Visits: ${workerVisits.length}`);
  console.log('\n🌍 All data is based on Surat, Gujarat, India');
  console.log('📧 Login as admin: admin@wallfloor.com');
  console.log('📧 Login as engineer: amit.patel@wallfloor.com (or any other engineer email)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
