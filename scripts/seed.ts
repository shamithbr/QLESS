import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, seedLocalStore, seedMongoDatabase } from '../src/server/db/store.ts';

async function main() {
  console.log('----------------------------------------------------');
  console.log('  QLESS – COLLEGE CANTEEN PRE-ORDERING DATABASE SEED');
  console.log('----------------------------------------------------');

  try {
    await initDatabase();
    seedLocalStore(true);
    await seedMongoDatabase();

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nSeeded Restaurants:');
    console.log('  1. KK Restaurant (40 menu items, Indian breakfast, thalis, Chinese, snacks)');
    console.log('  2. Tasty Cafe (20 menu items, Burgers, pizzas, pasta, fries, shakes)');
    console.log('  3. Rolls Up (20 menu items, Kathi rolls, wraps, paneer & chicken)');
    console.log('  4. Bombay Kulfi (10 menu items, Malai kulfi, falooda, rabri)');
    console.log('  5. Juicy Fruits (14 menu items, Fresh citrus, fruit juices, smoothies)');

    console.log('\nDevelopment Accounts:');
    console.log('  - Student:    QL1001     / Qless@123');
    console.log('  - Faculty:    QL2001     / Qless@123');
    console.log('  - KK Owner:   KKOWNER    / Qless@123');
    console.log('  - Tasty Owner: TASTYOWNER / Qless@123');
    console.log('  - Rolls Owner: ROLLSOWNER / Qless@123');
    console.log('  - Kulfi Owner: KULFIOWNER / Qless@123');
    console.log('  - Juicy Owner: JUICYOWNER / Qless@123');
    console.log('----------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

main();
