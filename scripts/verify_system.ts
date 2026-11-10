import bcrypt from 'bcryptjs';
import {
  initDatabase,
  findUserByIdentifier,
  getAllRestaurants,
  getFoodItemsByRestaurant,
  getAvailablePickupSlots,
  createOrderAtomic,
  updateOrderStatus,
  updateOrderPaymentStatus,
  getCustomerOrders,
  getRestaurantOrders,
  getOrderById,
} from '../src/server/db/store.ts';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   QLESS COMPREHENSIVE AUTOMATED VERIFICATION SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // Initialize DB
  await initDatabase();

  // Test 1: Verify Student Account
  const student = await findUserByIdentifier('QL1001');
  assert(!!student && student.role === 'student', '1. Student Account Exists & Role Verified (QL1001)');
  assert(bcrypt.compareSync('Qless@123', student?.passwordHash || ''), '2. Student Password Hash Validated');

  // Test 2: Verify Faculty Account
  const faculty = await findUserByIdentifier('QL2001');
  assert(!!faculty && faculty.role === 'faculty', '3. Faculty Account Exists & Role Verified (QL2001)');

  // Test 3: Verify All 5 Restaurant Owner Accounts
  const ownerIds = ['KKOWNER', 'TASTYOWNER', 'ROLLSOWNER', 'KULFIOWNER', 'JUICYOWNER'];
  for (const oId of ownerIds) {
    const owner = await findUserByIdentifier(oId);
    assert(
      !!owner && owner.role === 'restaurant_owner' && !!owner.restaurantId,
      `4. Owner Account Verified: ${oId} (Assigned Rest: ${owner?.restaurantId})`
    );
  }

  // Test 4: Verify Restaurants Count and Names
  const restaurants = await getAllRestaurants();
  assert(restaurants.length === 5, '5. Exactly 5 Restaurants Seeded');

  const expectedRestaurants = ['KK Restaurant', 'Tasty Cafe', 'Rolls Up', 'Bombay Kulfi', 'Juicy Fruits'];
  for (const name of expectedRestaurants) {
    const found = restaurants.some((r) => r.name === name);
    assert(found, `6. Restaurant Name Exact Match: "${name}"`);
  }

  // Test 5: Verify KK Restaurant Reference Photo
  const kkRest = restaurants.find((r) => r.name === 'KK Restaurant');
  assert(
    kkRest?.coverImage === '/assets/aistudio/WhatsApp_Image_2026-11-06_at_12.11.15_PM_1f298041.jpeg',
    '7. KK Restaurant Uses Supplied Reference Photograph'
  );

  // Test 6: Verify Rolls Up Reference Photo
  const rollsRest = restaurants.find((r) => r.name === 'Rolls Up');
  assert(
    rollsRest?.coverImage === '/assets/aistudio/WhatsApp_Image_2026-11-06_at_12.10.31_PM_c3a59347.jpeg',
    '8. Rolls Up Uses Supplied Reference Photograph'
  );

  // Test 7: Verify KK Restaurant Menu Count = EXACTLY 40 ITEMS
  const kkItems = await getFoodItemsByRestaurant('rest_kk');
  assert(kkItems.length === 40, `9. KK Restaurant Menu: Exactly 40 Items Seeded (Got ${kkItems.length})`);

  // Test 8: Verify Tasty Cafe Menu Count = EXACTLY 20 ITEMS
  const tastyItems = await getFoodItemsByRestaurant('rest_tasty');
  assert(tastyItems.length === 20, `10. Tasty Cafe Menu: Exactly 20 Items Seeded (Got ${tastyItems.length})`);

  // Test 9: Verify Rolls Up Menu Count = EXACTLY 20 ITEMS
  const rollsItems = await getFoodItemsByRestaurant('rest_rolls');
  assert(rollsItems.length === 20, `11. Rolls Up Menu: Exactly 20 Items Seeded (Got ${rollsItems.length})`);

  // Test 10: Verify Bombay Kulfi Menu Count = EXACTLY 10 ITEMS
  const kulfiItems = await getFoodItemsByRestaurant('rest_kulfi');
  assert(kulfiItems.length === 10, `12. Bombay Kulfi Menu: Exactly 10 Items Seeded (Got ${kulfiItems.length})`);

  // Test 11: Verify Juicy Fruits Menu Count
  const juicyItems = await getFoodItemsByRestaurant('rest_juicy');
  assert(juicyItems.length >= 10, `13. Juicy Fruits Menu Seeded (Got ${juicyItems.length} beverages/shakes)`);

  // Test 12: Pickup Slot Dynamic Engine
  const slots = await getAvailablePickupSlots('rest_kk');
  assert(slots.length > 0, `14. Dynamic Pickup Slots Generated for KK Restaurant (Count: ${slots.length})`);

  // Test 13: Order Creation & Single Restaurant Enforcement
  const testSlot = slots.find((s) => s.isAvailable) || slots[0];
  const order1 = await createOrderAtomic({
    customerUserId: 'QL1001',
    customerName: 'Aditya Sharma',
    customerRole: 'student',
    customerPhone: '+91 98765 43210',
    restaurantId: 'rest_kk',
    items: [
      { foodItemId: kkItems[0]._id!, quantity: 2 },
      { foodItemId: kkItems[4]._id!, quantity: 1 },
    ],
    pickupSlot: {
      date: testSlot.date,
      time: testSlot.time,
      formattedLabel: testSlot.formattedLabel,
    },
    paymentMethod: 'online_demo',
    paymentStatus: 'paid',
    paymentTransactionId: 'DEMO_TXN_VERIFY_101',
  });

  assert(!!order1 && !!order1.orderNumber, '15. Order Created Successfully in Database');
  assert(order1.orderStatus === 'awaiting_acceptance', '16. Initial Order Status is Strictly "awaiting_acceptance"');
  assert(order1.paymentStatus === 'paid', '17. Demo Online Payment Status Recorded as "paid"');

  // Test 14: Single Restaurant Validation Failure
  let crossRestaurantFailed = false;
  try {
    await createOrderAtomic({
      customerUserId: 'QL1001',
      customerName: 'Aditya Sharma',
      customerRole: 'student',
      customerPhone: '+91 98765 43210',
      restaurantId: 'rest_kk',
      items: [
        { foodItemId: tastyItems[0]._id!, quantity: 1 }, // Tasty cafe item submitted to KK
      ],
      pickupSlot: {
        date: testSlot.date,
        time: testSlot.time,
        formattedLabel: testSlot.formattedLabel,
      },
      paymentMethod: 'pay_at_counter',
      paymentStatus: 'pending',
    });
  } catch (err: any) {
    crossRestaurantFailed = true;
  }
  assert(crossRestaurantFailed, '18. Cross-Restaurant Item Validation Successfully Blocked');

  // Test 15: Counter Payment Order
  const orderCounter = await createOrderAtomic({
    customerUserId: 'QL2001',
    customerName: 'Dr. Meera Nambiar',
    customerRole: 'faculty',
    customerPhone: '+91 98765 12345',
    restaurantId: 'rest_rolls',
    items: [{ foodItemId: rollsItems[0]._id!, quantity: 1 }],
    pickupSlot: {
      date: testSlot.date,
      time: testSlot.time,
      formattedLabel: testSlot.formattedLabel,
    },
    paymentMethod: 'pay_at_counter',
    paymentStatus: 'pending',
  });
  assert(orderCounter.paymentStatus === 'pending', '19. Pay at Counter Status Initialized to "pending"');

  // Test 16: Owner Order Access Security
  const kkOrders = await getRestaurantOrders('rest_kk');
  const rollsOrders = await getRestaurantOrders('rest_rolls');
  assert(kkOrders.some((o) => o._id === order1._id), '20. KK Restaurant Owner Sees KK Order');
  assert(!rollsOrders.some((o) => o._id === order1._id), '21. Rolls Up Owner CANNOT See KK Order (Strict Isolation)');

  // Test 17: STRICT ORDER STATUS TRANSITION WORKFLOW (Section 14)
  // Action 1: Owner Accepts Order
  const acceptedOrder = await updateOrderStatus(order1._id!, 'rest_kk', 'accepted', 'Owner accepted order');
  assert(acceptedOrder.orderStatus === 'accepted', '22. Owner Action 1: Accepted (Customer sees "Order Accepted", NOT Preparing)');

  // Verify Invalid Jump to Ready before Preparing is blocked
  let invalidJumpBlocked = false;
  try {
    await updateOrderStatus(order1._id!, 'rest_kk', 'ready_for_pickup');
  } catch (err) {
    invalidJumpBlocked = true;
  }
  assert(invalidJumpBlocked, '23. Premature Jump to Ready Before Preparing is Blocked');

  // Action 2: Owner Clicks "Start Preparing"
  const preparingOrder = await updateOrderStatus(order1._id!, 'rest_kk', 'preparing', 'Kitchen chef started preparing');
  assert(preparingOrder.orderStatus === 'preparing', '24. Owner Action 2: Preparing (Customer only now sees "Preparing")');

  // Action 3: Owner Marks "Ready for Pickup"
  const readyOrder = await updateOrderStatus(order1._id!, 'rest_kk', 'ready_for_pickup', 'Food on counter');
  assert(readyOrder.orderStatus === 'ready_for_pickup', '25. Owner Action 3: Ready for Pickup');

  // Action 4: Owner Marks "Completed"
  const completedOrder = await updateOrderStatus(order1._id!, 'rest_kk', 'completed', 'Collected by student');
  assert(completedOrder.orderStatus === 'completed', '26. Owner Action 4: Order Completed');

  // Test 18: Pay at Counter Payment Collection
  const paidCounterOrder = await updateOrderPaymentStatus(orderCounter._id!, 'rest_rolls', 'paid');
  assert(paidCounterOrder.paymentStatus === 'paid', '27. Counter Payment Marked Paid by Restaurant Owner');

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
