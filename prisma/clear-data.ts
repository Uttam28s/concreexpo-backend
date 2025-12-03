import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clear all data from database except admin user credentials
 * This script will:
 * - Delete all inventory transactions
 * - Delete all worker visits
 * - Delete all appointments
 * - Delete all materials
 * - Delete all clients
 * - Delete all client types
 * - Delete all non-admin users (ENGINEER role)
 * - Delete all SMS logs
 * - Optionally clear settings (commented out by default)
 */
async function clearDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...');
    console.log('⚠️  This will delete ALL data except admin users!');
    
    // Get admin users count before deletion
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    console.log(`\n📊 Found ${adminCount} admin user(s) that will be preserved`);

    // Delete in order to respect foreign key constraints
    console.log('\n1️⃣  Deleting inventory transactions...');
    const deletedTransactions = await prisma.inventoryTransaction.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTransactions.count} inventory transactions`);

    console.log('\n2️⃣  Deleting worker visits...');
    const deletedVisits = await prisma.workerVisit.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVisits.count} worker visits`);

    console.log('\n3️⃣  Deleting appointments...');
    const deletedAppointments = await prisma.appointment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAppointments.count} appointments`);

    console.log('\n4️⃣  Deleting materials...');
    const deletedMaterials = await prisma.material.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMaterials.count} materials`);

    console.log('\n5️⃣  Deleting clients...');
    const deletedClients = await prisma.client.deleteMany({});
    console.log(`   ✅ Deleted ${deletedClients.count} clients`);

    console.log('\n6️⃣  Deleting client types...');
    const deletedClientTypes = await prisma.clientType.deleteMany({});
    console.log(`   ✅ Deleted ${deletedClientTypes.count} client types`);

    console.log('\n7️⃣  Deleting non-admin users (ENGINEER role)...');
    const deletedUsers = await prisma.user.deleteMany({
      where: { role: 'ENGINEER' },
    });
    console.log(`   ✅ Deleted ${deletedUsers.count} engineer users`);

    console.log('\n8️⃣  Deleting SMS logs...');
    const deletedSMSLogs = await prisma.sMSLog.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSMSLogs.count} SMS logs`);

    // Optionally clear settings (uncomment if you want to clear settings too)
    // console.log('\n9️⃣  Deleting settings...');
    // const deletedSettings = await prisma.settings.deleteMany({});
    // console.log(`   ✅ Deleted ${deletedSettings.count} settings`);

    // Verify admin users are still there
    const remainingAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        mobileNumber: true,
        role: true,
        isActive: true,
      },
    });

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Inventory Transactions: ${deletedTransactions.count} deleted`);
    console.log(`   • Worker Visits: ${deletedVisits.count} deleted`);
    console.log(`   • Appointments: ${deletedAppointments.count} deleted`);
    console.log(`   • Materials: ${deletedMaterials.count} deleted`);
    console.log(`   • Clients: ${deletedClients.count} deleted`);
    console.log(`   • Client Types: ${deletedClientTypes.count} deleted`);
    console.log(`   • Engineer Users: ${deletedUsers.count} deleted`);
    console.log(`   • SMS Logs: ${deletedSMSLogs.count} deleted`);
    console.log(`   • Admin Users Preserved: ${remainingAdmins.length}`);
    
    if (remainingAdmins.length > 0) {
      console.log('\n👤 Preserved Admin Users:');
      remainingAdmins.forEach((admin) => {
        console.log(`   • ${admin.email} (${admin.name}) - ${admin.mobileNumber}`);
      });
    } else {
      console.log('\n⚠️  WARNING: No admin users found in database!');
    }

    console.log('\n🎉 All data cleared except admin user credentials!');
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearDatabase()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

